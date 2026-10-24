const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  device_name: string;
  category: string;
  protocol?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { device_name, category, protocol }: RequestBody = await req.json();

    if (!device_name || !category) {
      return new Response(
        JSON.stringify({ error: 'device_name and category are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key from environment
    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map category to user-friendly name
    const categoryMap: Record<string, string> = {
      'mini_switch': 'Smart Light Switch',
      'touch_switch': 'Touch Smart Switch',
      'shutter_switch': 'Shutter Switch',
      'smart_shutter_switch': 'Smart Shutter Switch',
      'curtain_switch': 'Curtain Switch',
      'curtain_motor': 'Curtain Motor',
      'curtain_rail': 'Curtain Rail',
      'roller_blind_motor': 'Roller Blind Motor',
      'smart_plug': 'Smart Plug',
      'ir_remote': 'IR Remote Controller',
      'gas_sensor': 'Gas Sensor',
      'water_leak_sensor': 'Water Leak Sensor',
      'motion_sensor': 'Motion Sensor',
      'presence_sensor': 'Presence Sensor',
      'smoke_sensor': 'Smoke Sensor',
      'gas_valve': 'Gas Valve',
      'water_valve': 'Water Valve',
      'intercom': 'Intercom System',
      'camera': 'Security Camera',
      'wifi_camera': 'WiFi Camera',
      'smart_lock': 'Smart Lock',
      'zigbee_hub': 'Zigbee Hub',
      'matter_hub': 'Matter Hub',
      'access_point': 'WiFi Access Point',
      'repeater': 'WiFi Repeater',
      'mesh_wifi': 'Mesh WiFi System',
      'network_switch': 'Network Switch',
      'cat6_cable': 'CAT6 Cable',
      'bracket': 'Camera Bracket',
      'nvr': 'Network Video Recorder',
      'hdd': 'Hard Disk Drive',
      'memory_card': 'Memory Card',
      'central_control': 'Central Control Device',
      'custom_device': 'Custom Device'
    };

    const categoryName = categoryMap[category] || category;
    const protocolInfo = protocol ? ` using ${protocol.toUpperCase()} protocol` : '';

    // Create prompt for AI
    const prompt = `Generate exactly 3 brief, practical installation notes for a ${device_name} (${categoryName}${protocolInfo}) in a smart home system.

Requirements:
- Each note should be 1-2 sentences maximum
- Focus on practical installation tips, positioning, and technical considerations
- Include specific measurements or technical details where relevant
- Be concise and actionable
- Format as a numbered list (1., 2., 3.)
- Do not include any introductory text or explanations

Example format:
1. Install at 2.5-3m height facing the main entry point for optimal coverage.
2. Ensure stable WiFi signal strength (minimum -70 dBm) at installation location.
3. Avoid direct sunlight exposure to prevent lens glare and overheating.`;

    // Call Gemini API
    const apiUrl = 'https://app-85wlczelkwsh-api-VaOwP8E7dJqa.gateway.appmedo.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gateway-Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate suggestions', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse SSE stream
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonData = JSON.parse(line.slice(6));
              if (jsonData.candidates && jsonData.candidates[0]?.content?.parts) {
                const text = jsonData.candidates[0].content.parts[0]?.text || '';
                fullText += text;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    }

    // Parse the numbered list into array
    const suggestions = fullText
      .split('\n')
      .filter(line => /^\d+\./.test(line.trim()))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0)
      .slice(0, 3); // Ensure max 3 suggestions

    if (suggestions.length === 0) {
      // Fallback suggestions based on category
      const fallbackSuggestions = getFallbackSuggestions(category, device_name);
      return new Response(
        JSON.stringify({ suggestions: fallbackSuggestions }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ suggestions }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-installation-notes:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getFallbackSuggestions(category: string, deviceName: string): string[] {
  const fallbacks: Record<string, string[]> = {
    'camera': [
      'Install at 2.5-3m height facing entry points for optimal coverage.',
      'Ensure stable network connection with minimum -70 dBm signal strength.',
      'Avoid direct sunlight exposure to prevent lens glare and overheating.'
    ],
    'wifi_camera': [
      'Install at 2.5-3m height facing entry points for optimal coverage.',
      'Ensure stable WiFi signal strength (minimum -70 dBm) at installation location.',
      'Avoid direct sunlight exposure to prevent lens glare and overheating.'
    ],
    'mini_switch': [
      'Install behind existing wall switch without major rewiring.',
      'Ensure neutral wire availability for proper operation.',
      'Pair with mobile app after power restoration and network connection.'
    ],
    'touch_switch': [
      'Install at standard switch height (120-130cm from floor).',
      'Ensure stable power supply and neutral wire connection.',
      'Configure touch sensitivity settings via mobile app after installation.'
    ],
    'smart_lock': [
      'Ensure door thickness compatibility (typically 35-55mm).',
      'Install with backup mechanical key for emergency access.',
      'Test battery level indicator and set up low-battery alerts.'
    ],
    'access_point': [
      'Install centrally for optimal WiFi coverage throughout the area.',
      'Mount at ceiling height (2.5-3m) away from metal objects.',
      'Connect via PoE or ensure stable power supply nearby.'
    ],
    'network_switch': [
      'Install in well-ventilated area to prevent overheating.',
      'Label all ports clearly for easy cable management.',
      'Ensure adequate power supply for PoE devices if applicable.'
    ],
    'central_control': [
      'Install in central location with stable network connectivity.',
      'Ensure compatibility with all connected smart devices.',
      'Configure automation rules and scenes after initial setup.'
    ],
    'default': [
      'Follow manufacturer installation guidelines carefully.',
      'Ensure stable power supply and network connectivity.',
      'Test functionality thoroughly after installation.'
    ]
  };

  // Try to find category-specific fallback
  for (const key in fallbacks) {
    if (category.includes(key)) {
      return fallbacks[key];
    }
  }

  return fallbacks['default'];
}
