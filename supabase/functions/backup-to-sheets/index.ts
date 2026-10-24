// Backup Quotation to Google Sheets
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface QuotationData {
  id: string;
  project_code: string;
  client_name: string;
  client_address: string;
  client_phone: string;
  total_amount: number;
  status: string;
  created_at: string;
  rooms_data: any[];
  devices_data: any[];
  commissioning_price: number;
  installation_price: number;
  vat_percentage: number;
  discount_type: string | null;
  discount_value: number;
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Token refresh failed: ${errorData}`);
  }

  return await response.json();
}

async function getOrRefreshToken(supabase: any, userId: string): Promise<string> {
  // Get stored tokens
  const { data: tokenData, error: tokenError } = await supabase
    .from('google_oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (tokenError || !tokenData) {
    throw new Error('No Google OAuth tokens found. Please connect Google Sheets first.');
  }

  const now = new Date();
  const expiry = new Date(tokenData.token_expiry);

  // If token is expired or will expire in next 5 minutes, refresh it
  if (expiry.getTime() - now.getTime() < 5 * 60 * 1000) {
    const { access_token, expires_in } = await refreshAccessToken(tokenData.refresh_token);
    
    // Update stored token
    const newExpiry = new Date(Date.now() + expires_in * 1000);
    await supabase
      .from('google_oauth_tokens')
      .update({
        access_token,
        token_expiry: newExpiry.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return access_token;
  }

  return tokenData.access_token;
}

async function createOrGetSpreadsheet(accessToken: string, userId: string): Promise<string> {
  // Try to find existing spreadsheet in user's Drive
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='Smart Home Quotations Backup' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!searchResponse.ok) {
    throw new Error('Failed to search for existing spreadsheet');
  }

  const searchData = await searchResponse.json();

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create new spreadsheet
  const createResponse = await fetch(
    'https://sheets.googleapis.com/v4/spreadsheets',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: 'Smart Home Quotations Backup',
        },
        sheets: [{
          properties: {
            title: 'Quotations',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        }],
      }),
    }
  );

  if (!createResponse.ok) {
    const errorData = await createResponse.text();
    throw new Error(`Failed to create spreadsheet: ${errorData}`);
  }

  const createData = await createResponse.json();
  
  // Add header row
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${createData.spreadsheetId}/values/Quotations!A1:append?valueInputOption=RAW`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [[
          'Quotation ID',
          'Project Code',
          'Client Name',
          'Client Address',
          'Client Phone',
          'Total Devices',
          'Total Amount (EGP)',
          'Commissioning Fee',
          'Installation Fee',
          'VAT %',
          'Discount Type',
          'Discount Value',
          'Status',
          'Created At',
          'Backup Date',
        ]],
      }),
    }
  );

  return createData.spreadsheetId;
}

async function backupQuotationToSheet(
  accessToken: string,
  spreadsheetId: string,
  quotation: QuotationData
): Promise<void> {
  const totalDevices = quotation.devices_data?.length || 0;
  const backupDate = new Date().toISOString();

  const row = [
    quotation.id,
    quotation.project_code,
    quotation.client_name || '',
    quotation.client_address || '',
    quotation.client_phone || '',
    totalDevices,
    quotation.total_amount,
    quotation.commissioning_price,
    quotation.installation_price,
    quotation.vat_percentage,
    quotation.discount_type || 'None',
    quotation.discount_value || 0,
    quotation.status,
    quotation.created_at,
    backupDate,
  ];

  // Check if quotation already exists in sheet
  const searchResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Quotations!A:A`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!searchResponse.ok) {
    throw new Error('Failed to search existing data');
  }

  const searchData = await searchResponse.json();
  const existingRows = searchData.values || [];
  const rowIndex = existingRows.findIndex((r: string[]) => r[0] === quotation.id);

  if (rowIndex > 0) {
    // Update existing row
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Quotations!A${rowIndex + 1}:O${rowIndex + 1}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [row],
        }),
      }
    );
  } else {
    // Append new row
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Quotations!A:O:append?valueInputOption=RAW`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [row],
        }),
      }
    );
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Validate environment variables
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error('Missing Google OAuth environment variables');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase environment variables');
    }

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Get request body
    const body = await req.json();
    const { quotation_id, backup_type = 'manual' } = body;

    if (!quotation_id) {
      throw new Error('Missing quotation_id');
    }

    // Get quotation data
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', quotation_id)
      .eq('user_id', user.id)
      .single();

    if (quotationError || !quotation) {
      throw new Error('Quotation not found');
    }

    // Get or refresh access token
    const accessToken = await getOrRefreshToken(supabase, user.id);

    // Create or get spreadsheet
    const spreadsheetId = await createOrGetSpreadsheet(accessToken, user.id);

    // Backup quotation to sheet
    await backupQuotationToSheet(accessToken, spreadsheetId, quotation);

    // Record backup history
    await supabase
      .from('backup_history')
      .insert({
        user_id: user.id,
        quotation_id,
        backup_type,
        status: 'success',
        spreadsheet_id: spreadsheetId,
        sheet_name: 'Quotations',
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Quotation backed up successfully',
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error in backup-to-sheets:', error);

    // Try to record failed backup
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        
        if (user) {
          const body = await req.json();
          await supabase
            .from('backup_history')
            .insert({
              user_id: user.id,
              quotation_id: body.quotation_id,
              backup_type: body.backup_type || 'manual',
              status: 'failed',
              error_message: error.message,
            });
        }
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
