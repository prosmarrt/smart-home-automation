import { supabase } from './supabase';
import type { Room, Device, ClientInfo, DevicePrice, DeviceCategory, Protocol, SwitchGang, IntercomType, VATSettings, Quotation, QuotationVersion, Profile, CommissioningInstallation, Payment, PaymentMethod, DeviceTemplate } from '@/types/types';
import { priceHistoryApi } from './priceHistoryApi';
import { priceApprovalsApi } from './priceApprovalsApi';
import { withRetry, isTransientError } from '@/utils/retry';

export { priceApprovalsApi };

export async function getUserId(): Promise<string> {
  return withRetry(async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) {
      // Check if session exists in storage
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) return session.user.id;
      throw new Error('User not authenticated');
    }
    return user.id;
  }, {
    maxRetries: 2,
    initialDelayMs: 350,
    shouldRetry: (err) => {
      if (err instanceof Error && err.message === 'User not authenticated') {
        return false;
      }
      return isTransientError(err);
    }
  });
}

export async function isAdmin(): Promise<boolean> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  
  if (error) return false;
  return data?.role === 'admin';
}

export const roomsApi = {
  async getAll(): Promise<Room[]> {
    return withRetry(async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return Array.isArray(data) ? data : [];
    });
  },

  async create(name: string): Promise<Room> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('rooms')
      .insert({ user_id: userId, name })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create room');
    return data;
  },

  async update(id: string, name: string): Promise<Room> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('rooms')
      .update({ name })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Room not found or you do not have permission to update it');
    return data;
  },

  async delete(id: string): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }
};

export const devicesApi = {
  async getAll(): Promise<Device[]> {
    return withRetry(async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return Array.isArray(data) ? data : [];
    });
  },

  async getByRoom(roomId: string): Promise<Device[]> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', userId)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async create(device: Omit<Device, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Device> {
    const userId = await getUserId();
    
    const { data, error } = await supabase
      .from('devices')
      .insert({ ...device, user_id: userId })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create device');
    
    return data;
  },

  async update(id: string, updates: Partial<Device>): Promise<Device> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('devices')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update device');
    return data;
  },

  async delete(id: string): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async updateRoomAssignment(deviceId: string, roomId: string | null): Promise<Device> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('devices')
      .update({ room_id: roomId })
      .eq('id', deviceId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update device room assignment');
    return data;
  }
};

export const clientInfoApi = {
  async get(): Promise<ClientInfo | null> {
    return withRetry(async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('client_info')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    });
  },

  async create(clientData: {
    client_name: string;
    address?: string;
    phone_number?: string;
    project_code: string;
  }): Promise<ClientInfo> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('client_info')
      .insert({
        user_id: userId,
        client_name: clientData.client_name,
        address: clientData.address || null,
        phone_number: clientData.phone_number || null,
        project_code: clientData.project_code
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create client info');
    return data;
  },

  async update(id: string, updates: Partial<Omit<ClientInfo, 'id' | 'created_at' | 'updated_at'>>): Promise<ClientInfo> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('client_info')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update client info');
    return data;
  },

  async delete(id: string): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase
      .from('client_info')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async deleteAll(): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase
      .from('client_info')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  }
};

export async function clearAllQuotationData(): Promise<void> {
  const userId = await getUserId();
  
  await Promise.all([
    supabase.from('devices').delete().eq('user_id', userId),
    supabase.from('rooms').delete().eq('user_id', userId),
    clientInfoApi.deleteAll()
  ]);
}

export const devicePricesApi = {
  async getAll(): Promise<DevicePrice[]> {
    const { data, error } = await supabase
      .from('device_prices')
      .select('*')
      .order('category', { ascending: true });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getPrice(category: DeviceCategory, protocol?: Protocol | null, gang?: SwitchGang | null, intercomType?: IntercomType | null): Promise<number> {
    let query = supabase
      .from('device_prices')
      .select('unit_price')
      .eq('category', category);

    if (protocol != null) {
      query = query.eq('protocol', protocol);
    }
    if (gang != null) {
      query = query.eq('gang', gang);
    }
    if (intercomType != null) {
      query = query.eq('intercom_type', intercomType);
    }

    const { data } = await query.maybeSingle();
    return data?.unit_price || 0;
  },

  async getCostPrice(category: DeviceCategory, protocol?: Protocol | null, gang?: SwitchGang | null, intercomType?: IntercomType | null): Promise<number> {
    let query = supabase
      .from('device_prices')
      .select('cost_price')
      .eq('category', category);

    if (protocol != null) {
      query = query.eq('protocol', protocol);
    }
    if (gang != null) {
      query = query.eq('gang', gang);
    }
    if (intercomType != null) {
      query = query.eq('intercom_type', intercomType);
    }

    const { data } = await query.maybeSingle();
    return data?.cost_price || 0;
  },

  async upsert(price: Omit<DevicePrice, 'created_at' | 'updated_at'>): Promise<DevicePrice> {
    // Check if price already exists to determine if this is an update
    let existingPrice: DevicePrice | null = null;
    
    if (price.id) {
      const { data: existing } = await supabase
        .from('device_prices')
        .select('*')
        .eq('id', price.id)
        .maybeSingle();
      existingPrice = existing;
    } else {
      const { data: existing } = await supabase
        .from('device_prices')
        .select('*')
        .eq('category', price.category)
        .eq('protocol', price.protocol || null)
        .eq('gang', price.gang || null)
        .eq('camera_resolution', price.camera_resolution || null)
        .eq('camera_type', price.camera_type || null)
        .eq('nvr_channels', price.nvr_channels || null)
        .eq('hdd_capacity', price.hdd_capacity || null)
        .eq('intercom_type', price.intercom_type || null)
        .eq('switch_type', price.switch_type || null)
        .eq('switch_ports', price.switch_ports || null)
        .maybeSingle();

      existingPrice = existing;
    }

    // The migrated database intentionally has no unique constraint on the
    // configuration columns because the legacy backup contains duplicate
    // configurations. Therefore do not use PostgREST upsert/onConflict here.
    // Treat an empty id as "new", and update an existing matched row by id.
    let data: DevicePrice | null = null;
    let error: any = null;

    if (price.id) {
      const result = await supabase
        .from('device_prices')
        .update(price)
        .eq('id', price.id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else if (existingPrice?.id) {
      const result = await supabase
        .from('device_prices')
        .update(price)
        .eq('id', existingPrice.id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      const { id: _emptyId, ...insertPrice } = price as any;
      const result = await supabase
        .from('device_prices')
        .insert(insertPrice)
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) throw error;
    if (!data) throw new Error('Failed to save device price');
    
    // Log price change if this was an update and price changed
    if (existingPrice && existingPrice.unit_price !== price.unit_price) {
      const deviceName = price.device_name || 
        `${price.brand || ''} ${price.model || ''}`.trim() ||
        'Unknown Device';
      
      try {
        await priceHistoryApi.log({
          device_price_id: data.id,
          device_name: deviceName,
          device_category: price.category,
          old_price: existingPrice.unit_price,
          new_price: price.unit_price,
          change_type: 'update',
          change_reason: 'Manual price update'
        });

        // Mark unpaid quotations (no payments made) as having pending price updates
        await supabase
          .from('quotations')
          .update({ pending_price_update: true })
          .in('status', ['Draft', 'Approved'])
          .eq('total_paid', 0)
          .is('update_ignored_at', null)
          .is('update_applied_at', null);
      } catch (logError) {
        console.error('Failed to log price change:', logError);
      }
    } else if (!existingPrice) {
      // Log initial price setting
      const deviceName = price.device_name || 
        `${price.brand || ''} ${price.model || ''}`.trim() ||
        'Unknown Device';
      
      try {
        await priceHistoryApi.log({
          device_price_id: data.id,
          device_name: deviceName,
          device_category: price.category,
          old_price: 0,
          new_price: price.unit_price,
          change_type: 'initial',
          change_reason: 'Initial price setting'
        });
      } catch (logError) {
        console.error('Failed to log initial price:', logError);
      }
    }
    
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('device_prices')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async submitForApproval(price: Omit<DevicePrice, 'id' | 'created_at' | 'updated_at'>, reason?: string): Promise<void> {
    const userId = await getUserId();

    // Check if price already exists
    const { data: existing } = await supabase
      .from('device_prices')
      .select('*')
      .eq('category', price.category)
      .eq('protocol', price.protocol || null)
      .eq('gang', price.gang || null)
      .eq('camera_resolution', price.camera_resolution || null)
      .eq('camera_type', price.camera_type || null)
      .eq('nvr_channels', price.nvr_channels || null)
      .eq('hdd_capacity', price.hdd_capacity || null)
      .eq('intercom_type', price.intercom_type || null)
      .eq('switch_type', price.switch_type || null)
      .eq('switch_ports', price.switch_ports || null)
      .maybeSingle();

    if (existing) {
      // Update existing price with pending approval
      const { error } = await supabase
        .from('device_prices')
        .update({
          pending_price: price.unit_price,
          pending_approval: true,
          price_change_requested_by: userId,
          price_change_requested_at: new Date().toISOString(),
          brand: price.brand,
          model: price.model,
          device_name: price.device_name,
          description: price.description,
          notes: price.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error) throw error;

      // Create approval request
      const deviceName = price.device_name || 
        `${price.brand || ''} ${price.model || ''}`.trim() ||
        'Unknown Device';

      await priceApprovalsApi.submit({
        device_price_id: existing.id,
        device_name: deviceName,
        device_category: price.category,
        old_price: existing.unit_price,
        new_price: price.unit_price,
        reason
      });
    } else {
      // For new prices, create directly without approval
      await this.upsert({ ...price, id: '' });
    }
  },

  async getUniqueModels(category?: DeviceCategory, brand?: string): Promise<string[]> {
    let query = supabase
      .from('device_prices')
      .select('model')
      .not('model', 'is', null)
      .neq('model', '');

    if (category) {
      query = query.eq('category', category);
    }

    if (brand && brand !== 'none') {
      query = query.eq('brand', brand);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching unique models:', error);
      return [];
    }

    // Extract unique models and filter out nulls/empty strings
    const models = Array.from(new Set(
      (data || [])
        .map(item => item.model)
        .filter((model): model is string => !!model && model.trim() !== '')
    ));

    return models.sort();
  },

  async applyGlobalMarkup(percentage: number, autoApplyToDrafts: boolean = false): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.rpc('apply_global_markup', { 
      markup_percentage: percentage,
      user_id: userId,
      auto_apply_to_drafts: autoApplyToDrafts
    });
    if (error) throw error;

    if (autoApplyToDrafts) {
      await quotationsApi.autoApplyPriceUpdatesToDrafts();
    }
  }
};

// Authentication API
export const authApi = {
  async signUp(username: string, password: string, email?: string, phone?: string) {
    const authEmail = email || `${username}@miaoda.com`;
    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password,
      phone,
      options: {
        data: {
          username,
          phone: phone || null,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    });
    if (error) throw error;
    
    // Note: Profile is automatically created by database trigger
    // No manual profile update needed
    
    return data;
  },

  async signIn(username: string, password: string) {
    try {
      const email = `${username}@miaoda.com`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } catch (error) {
      // Enhanced error handling for network issues
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Failed to fetch: Unable to connect to authentication server. Please check your internet connection.');
      }
      throw error;
    }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getUser() {
    return withRetry(async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    }, { maxRetries: 2, initialDelayMs: 300 });
  },

  async getSession() {
    return withRetry(async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    }, { maxRetries: 2, initialDelayMs: 300 });
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Profile API
export const profileApi = {
  async getProfile(): Promise<Profile | null> {
    return withRetry(async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    });
  },

  async getAllProfiles(): Promise<Profile[]> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return Array.isArray(data) ? data : [];
    });
  },

  async updateRole(userId: string, role: 'user' | 'admin'): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update role');
    return data;
  },

  async approveUser(userId: string, approve: boolean): Promise<void> {
    const { error } = await supabase.rpc('approve_user', {
      target_user_id: userId,
      approve: approve
    });

    if (error) throw error;
  },

  async declineUser(userId: string): Promise<void> {
    const { error } = await supabase.rpc('decline_user', {
      target_user_id: userId
    });

    if (error) throw error;
  },

  async suspendUser(userId: string, suspend: boolean): Promise<void> {
    const { error } = await supabase.rpc('suspend_user', {
      target_user_id: userId,
      do_suspend: suspend
    });

    if (error) throw error;
  },

  async deleteUser(userId: string): Promise<void> {
    const { error } = await supabase.rpc('delete_user_account', {
      target_user_id: userId
    });

    if (error) throw error;
  }
};

// VAT Settings API
export const vatSettingsApi = {
  async get(): Promise<VATSettings | null> {
    return withRetry(async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('vat_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    });
  },

  async upsert(vatPercentage: number): Promise<VATSettings> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('vat_settings')
      .upsert({ user_id: userId, vat_percentage: vatPercentage }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to save VAT settings');
    return data;
  }
};

// Quotations API
export const quotationsApi = {
  async getAll(): Promise<Quotation[]> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return Array.isArray(data) ? data : [];
    });
  },

  async getById(id: string): Promise<Quotation | null> {
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(quotation: Omit<Quotation, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Quotation> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('quotations')
      .insert({ ...quotation, user_id: userId })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create quotation');
    return data;
  },

  /**
   * Update ONLY the status field — no versioning, no amendment date, no side-effects.
   * Use this for all workflow status transitions (Draft→Approved, Approved→Pipeline, etc.)
   * instead of the heavy `update()` which creates a version snapshot.
   */
  async updateStatus(id: string, newStatus: string): Promise<void> {
    const userId = await getUserId();
    const adminUser = await isAdmin();

    let query = supabase
      .from('quotations')
      .update({ status: newStatus })
      .eq('id', id);

    if (!adminUser) {
      query = query.eq('user_id', userId);
    }

    const { error } = await query;
    if (error) throw error;
  },

  async update(id: string, quotation: Partial<Omit<Quotation, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Quotation> {
    const userId = await getUserId();
    const adminUser = await isAdmin();
    
    // Get current quotation to save as version
    const currentQuery = supabase
      .from('quotations')
      .select('*')
      .eq('id', id);
    
    const { data: currentQuotation } = await (adminUser ? currentQuery : currentQuery.eq('user_id', userId)).maybeSingle();
    
    // Save current state as a version before updating
    if (currentQuotation) {
      const versionNumber = (currentQuotation.current_version || 1);
      
      await supabase
        .from('quotation_versions')
        .insert({
          quotation_id: id,
          version_number: versionNumber,
          project_code: currentQuotation.project_code,
          client_name: currentQuotation.client_name,
          client_address: currentQuotation.client_address,
          client_phone: currentQuotation.client_phone,
          global_protocol: currentQuotation.global_protocol,
          vat_percentage: currentQuotation.vat_percentage,
          rooms_data: currentQuotation.rooms_data,
          devices_data: currentQuotation.devices_data,
          commissioning_price: currentQuotation.commissioning_price,
          visit_price: currentQuotation.visit_price,
          installation_price: currentQuotation.installation_price,
          total_amount: currentQuotation.total_amount,
          discount_type: currentQuotation.discount_type,
          discount_value: currentQuotation.discount_value,
          client_approval: currentQuotation.client_approval,
          approval_date: currentQuotation.approval_date,
          installation_date: currentQuotation.installation_date,
          last_edited_by: currentQuotation.last_edited_by,
          last_edited_at: currentQuotation.last_edited_at,
          last_amendment_date: currentQuotation.last_amendment_date,
          created_at: currentQuotation.updated_at || currentQuotation.created_at
        });
    }
    
    // Increment version number and set last_edited_by and last_edited_at
    const newVersion = (currentQuotation?.current_version || 1) + 1;
    
    // Determine if this is an amendment (change to an already approved quotation)
    const isAmendment = currentQuotation?.client_approval || currentQuotation?.status === 'Approved' || currentQuotation?.status === 'Partially Paid' || currentQuotation?.status === 'Fully Paid';
    
    const updatedQuotation = { 
      ...quotation, 
      current_version: newVersion,
      last_edited_by: userId,
      last_edited_at: new Date().toISOString(),
      ...(isAmendment ? { last_amendment_date: new Date().toISOString() } : {})
    };
    
    let query = supabase
      .from('quotations')
      .update(updatedQuotation)
      .eq('id', id);
    
    // Only filter by user_id if not admin
    if (!adminUser) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.select().single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update quotation');
    return data;
  },

  async delete(id: string): Promise<void> {
    const userId = await getUserId();
    const adminUser = await isAdmin();
    
    let query = supabase
      .from('quotations')
      .delete()
      .eq('id', id);
    
    // Only filter by user_id if not admin
    if (!adminUser) {
      query = query.eq('user_id', userId);
    }
    
    const { error } = await query;

    if (error) throw error;
  },

  async calculateTotals(quotationId: string): Promise<void> {
    const { error } = await supabase.rpc('calculate_quotation_totals', {
      p_quotation_id: quotationId
    });

    if (error) throw error;
  },

  async convertToInvoice(quotationId: string): Promise<string> {
    const { data, error } = await supabase.rpc('convert_to_invoice', {
      p_quotation_id: quotationId
    });

    if (error) throw error;
    if (!data) throw new Error('Failed to convert to invoice');
    return data;
  },

  async getVersionHistory(quotationId: string): Promise<QuotationVersion[]> {
    // Get the current quotation
    const { data: currentQuotation, error: currentError } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', quotationId)
      .maybeSingle();

    if (currentError) throw currentError;
    if (!currentQuotation) return [];

    // Query the quotation_versions table for historical versions
    const { data: historicalVersions, error: versionsError } = await supabase
      .from('quotation_versions')
      .select('*')
      .eq('quotation_id', quotationId)
      .order('version_number', { ascending: false });

    if (versionsError) throw versionsError;
    
    // Collect all user IDs for fetching profile information
    const userIds = new Set<string>();
    if (currentQuotation.last_edited_by) userIds.add(currentQuotation.last_edited_by);
    if (currentQuotation.user_id) userIds.add(currentQuotation.user_id);
    historicalVersions?.forEach(v => {
      if (v.last_edited_by) userIds.add(v.last_edited_by);
    });
    
    // Fetch profile information for all editors
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, username')
      .in('id', Array.from(userIds));
    
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    // Create version array starting with current version
    const versions: QuotationVersion[] = [];
    
    // Add current version (latest)
    const currentEditorId = currentQuotation.last_edited_by || currentQuotation.user_id;
    const currentEditorProfile = currentEditorId ? profileMap.get(currentEditorId) : null;
    
    versions.push({
      id: currentQuotation.id,
      quotation_id: currentQuotation.id,
      version_number: currentQuotation.current_version || 1,
      project_code: currentQuotation.project_code,
      client_name: currentQuotation.client_name || '',
      client_address: currentQuotation.client_address || '',
      client_phone: currentQuotation.client_phone || '',
      global_protocol: currentQuotation.global_protocol,
      vat_percentage: currentQuotation.vat_percentage || 0,
      rooms_data: currentQuotation.rooms_data || [],
      devices_data: currentQuotation.devices_data || [],
      commissioning_price: currentQuotation.commissioning_price || 0,
      visit_price: currentQuotation.visit_price || 0,
      installation_price: currentQuotation.installation_price || 0,
      total_amount: currentQuotation.total_amount || 0,
      discount_type: currentQuotation.discount_type || null,
      discount_value: currentQuotation.discount_value || 0,
      client_approval: currentQuotation.client_approval || false,
      approval_date: currentQuotation.approval_date || null,
      installation_date: currentQuotation.installation_date || null,
      last_edited_by: currentQuotation.last_edited_by,
      last_edited_at: currentQuotation.last_edited_at,
      last_amendment_date: currentQuotation.last_amendment_date,
      created_at: currentQuotation.created_at,
      editor_email: currentEditorProfile?.email || null,
      editor_username: currentEditorProfile?.username || null
    });
    
    // Add historical versions
    if (historicalVersions && historicalVersions.length > 0) {
      historicalVersions.forEach(v => {
        const editorProfile = v.last_edited_by ? profileMap.get(v.last_edited_by) : null;
        
        versions.push({
          id: v.id,
          quotation_id: v.quotation_id,
          version_number: v.version_number,
          project_code: v.project_code,
          client_name: v.client_name || '',
          client_address: v.client_address || '',
          client_phone: v.client_phone || '',
          global_protocol: v.global_protocol,
          vat_percentage: v.vat_percentage || 0,
          rooms_data: v.rooms_data || [],
          devices_data: v.devices_data || [],
          commissioning_price: v.commissioning_price || 0,
          visit_price: v.visit_price || 0,
          installation_price: v.installation_price || 0,
          total_amount: v.total_amount || 0,
          discount_type: v.discount_type || null,
          discount_value: v.discount_value || 0,
          client_approval: v.client_approval || false,
          approval_date: v.approval_date || null,
          installation_date: v.installation_date || null,
          last_edited_by: v.last_edited_by,
          last_edited_at: v.last_edited_at,
          last_amendment_date: v.last_amendment_date,
          created_at: v.created_at,
          editor_email: editorProfile?.email || null,
          editor_username: editorProfile?.username || null
        });
      });
    }

    return versions;
  },

  async getVersionById(quotationId: string, versionNumber: number): Promise<QuotationVersion | null> {
    // First, check if this is the current version by getting the quotation
    const { data: currentQuotation, error: currentError } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', quotationId)
      .maybeSingle();

    if (currentError) throw currentError;
    
    // If this is the current version, return it from quotations table
    if (currentQuotation && currentQuotation.current_version === versionNumber) {
      // Get editor profile information
      const editorId = currentQuotation.last_edited_by || currentQuotation.user_id;
      let editorEmail: string | null = null;
      let editorUsername: string | null = null;
      
      if (editorId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, username')
          .eq('id', editorId)
          .maybeSingle();
        
        if (profile) {
          editorEmail = profile.email;
          editorUsername = profile.username;
        }
      }

      return {
        id: currentQuotation.id,
        quotation_id: currentQuotation.id,
        version_number: currentQuotation.current_version || 1,
        project_code: currentQuotation.project_code,
        client_name: currentQuotation.client_name || '',
        client_address: currentQuotation.client_address || '',
        client_phone: currentQuotation.client_phone || '',
        global_protocol: currentQuotation.global_protocol,
        vat_percentage: currentQuotation.vat_percentage || 0,
        rooms_data: currentQuotation.rooms_data || [],
        devices_data: currentQuotation.devices_data || [],
        commissioning_price: currentQuotation.commissioning_price || 0,
        visit_price: currentQuotation.visit_price || 0,
        installation_price: currentQuotation.installation_price || 0,
        total_amount: currentQuotation.total_amount || 0,
        discount_type: currentQuotation.discount_type || null,
        discount_value: currentQuotation.discount_value || 0,
        client_approval: currentQuotation.client_approval || false,
        approval_date: currentQuotation.approval_date || null,
        installation_date: currentQuotation.installation_date || null,
        last_edited_by: currentQuotation.last_edited_by,
        last_edited_at: currentQuotation.last_edited_at,
        last_amendment_date: currentQuotation.last_amendment_date,
        created_at: currentQuotation.created_at,
        editor_email: editorEmail,
        editor_username: editorUsername
      };
    }

    // Otherwise, query the quotation_versions table for historical version
    const { data, error } = await supabase
      .from('quotation_versions')
      .select('*')
      .eq('quotation_id', quotationId)
      .eq('version_number', versionNumber)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // Get editor profile information if available
    let editorEmail: string | null = null;
    let editorUsername: string | null = null;
    
    if (data.last_edited_by) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, username')
        .eq('id', data.last_edited_by)
        .maybeSingle();
      
      if (profile) {
        editorEmail = profile.email;
        editorUsername = profile.username;
      }
    }

    // Map to QuotationVersion format
    return {
      id: data.id,
      quotation_id: data.quotation_id,
      version_number: data.version_number,
      project_code: data.project_code,
      client_name: data.client_name || '',
      client_address: data.client_address || '',
      client_phone: data.client_phone || '',
      global_protocol: data.global_protocol,
      vat_percentage: data.vat_percentage || 0,
      rooms_data: data.rooms_data || [],
      devices_data: data.devices_data || [],
      commissioning_price: data.commissioning_price || 0,
      visit_price: data.visit_price || 0,
      installation_price: data.installation_price || 0,
      total_amount: data.total_amount || 0,
      discount_type: data.discount_type || null,
      discount_value: data.discount_value || 0,
      client_approval: data.client_approval || false,
      approval_date: data.approval_date,
      installation_date: data.installation_date,
      last_edited_by: data.last_edited_by || null,
      last_edited_at: data.last_edited_at || null,
      last_amendment_date: data.last_amendment_date || null,
      created_at: data.created_at,
      editor_email: editorEmail,
      editor_username: editorUsername
    };
  },

  async applyPriceIncrease(quotationId: string, reason: string): Promise<Quotation> {
    const userId = await getUserId();
    const adminUser = await isAdmin();
    
    if (!adminUser) {
      throw new Error('Only administrators can apply price increases');
    }

    // Get current quotation
    const quotation = await this.getById(quotationId);
    if (!quotation) throw new Error('Quotation not found');

    // Get current device prices and update quotation devices
    const updatedDevices = await Promise.all(
      quotation.devices_data.map(async (device) => {
        const currentPrice = await devicePricesApi.getPrice(
          device.category,
          device.protocol,
          device.gang,
          device.intercom_type
        );
        
        return {
          ...device,
          unit_price: currentPrice || device.unit_price,
          total_price: (currentPrice || device.unit_price) * device.quantity
        };
      })
    );

    // Recalculate totals
    const subtotal = updatedDevices.reduce((sum, device) => sum + device.total_price, 0);
    const commissioning = quotation.commissioning_price || 0;
    const visit = quotation.visit_price || 0;
    const installation = quotation.installation_price || 0;
    const discount = quotation.discount_value || 0;
    
    // Calculate total before VAT
    let totalBeforeVat = subtotal + commissioning + visit + installation;
    
    // Apply discount
    if (quotation.discount_type === 'percentage') {
      totalBeforeVat = totalBeforeVat - (totalBeforeVat * discount / 100);
    } else if (quotation.discount_type === 'fixed') {
      totalBeforeVat = totalBeforeVat - discount;
    }
    
    const vatAmount = (totalBeforeVat * quotation.vat_percentage) / 100;
    const totalAmount = totalBeforeVat + vatAmount;
    const remainingBalance = totalAmount - quotation.total_paid;

    // Update quotation with new prices and totals
    const { data, error } = await supabase
      .from('quotations')
      .update({
        devices_data: updatedDevices,
        total_amount: totalAmount,
        remaining_balance: remainingBalance,
        pending_price_update: false,
        update_applied_at: new Date().toISOString(),
        update_applied_by: userId,
        price_snapshot_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', quotationId)
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      throw error;
    }
    if (!data) throw new Error('Failed to apply price increase');

    // Log the action
    try {
      await priceHistoryApi.log({
        quotation_id: quotationId,
        device_name: 'Quotation Price Update',
        device_category: 'quotation',
        old_price: quotation.total_amount,
        new_price: totalAmount,
        change_type: 'apply_increase',
        change_reason: reason
      });
    } catch (logError) {
      console.error('Failed to log price increase application:', logError);
    }

    return data;
  },

  async autoApplyPriceUpdatesToDrafts(): Promise<void> {
    const adminUser = await isAdmin();
    if (!adminUser) throw new Error('Only administrators can apply batch price updates');

    const { data: drafts, error } = await supabase
      .from('quotations')
      .select('id')
      .eq('status', 'Draft')
      .eq('total_paid', 0);

    if (error) throw error;
    if (!drafts || drafts.length === 0) return;

    for (const draft of drafts) {
      try {
        await this.applyPriceIncrease(draft.id, 'Auto-applied global markup update');
      } catch (err) {
        console.error(`Failed to auto-apply price update to quotation ${draft.id}:`, err);
      }
    }
  },

  async ignorePriceUpdate(quotationId: string, reason: string): Promise<Quotation> {
    const userId = await getUserId();
    const adminUser = await isAdmin();
    
    if (!adminUser) {
      throw new Error('Only administrators can ignore price updates');
    }

    // Get current quotation
    const quotation = await this.getById(quotationId);
    if (!quotation) throw new Error('Quotation not found');

    // Update quotation to mark price update as ignored
    const { data, error } = await supabase
      .from('quotations')
      .update({
        pending_price_update: false,
        update_ignored_at: new Date().toISOString(),
        update_ignored_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', quotationId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to ignore price update');

    // Log the action
    try {
      await priceHistoryApi.log({
        quotation_id: quotationId,
        device_name: 'Quotation Price Update',
        device_category: 'quotation',
        old_price: quotation.total_amount,
        new_price: quotation.total_amount,
        change_type: 'ignore_update',
        change_reason: reason
      });
    } catch (logError) {
      console.error('Failed to log price update ignore:', logError);
    }

    return data;
  },

  async checkForPriceUpdates(quotationId: string): Promise<boolean> {
    // Get quotation
    const quotation = await this.getById(quotationId);
    if (!quotation || !quotation.price_snapshot_date) {
      return false;
    }

    // Check if any device prices have changed since snapshot
    const { comparePrices } = await import('@/utils/priceComparison');
    const priceChange = await comparePrices(quotation.devices_data, quotation.price_snapshot_date);

    // If prices increased and quotation has no payments, mark as pending update
    if (priceChange.hasChanges && priceChange.percentageIncrease > 0 && 
        (quotation.status === 'Draft' || quotation.status === 'Approved') &&
        quotation.total_paid === 0) {
      
      const { data, error } = await supabase
        .from('quotations')
        .update({ pending_price_update: true })
        .eq('id', quotationId)
        .select()
        .single();
      
      if (error) {
        console.error('Failed to mark quotation:', error);
        return false;
      }
      
      return true;
    }

    return false;
  },

  async approveQuotation(quotationId: string, notes?: string): Promise<Quotation> {
    const userId = await getUserId();
    const adminUser = await isAdmin();

    if (!adminUser) {
      throw new Error('Only administrators can approve quotations');
    }

    const { data, error } = await supabase
      .from('quotations')
      .update({
        status: 'Approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        approval_notes: notes || null,
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', quotationId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to approve quotation');

    return data;
  },

  async rejectQuotation(quotationId: string, reason: string): Promise<Quotation> {
    const userId = await getUserId();
    const adminUser = await isAdmin();

    if (!adminUser) {
      throw new Error('Only administrators can reject quotations');
    }

    const { data, error } = await supabase
      .from('quotations')
      .update({
        rejected_by: userId,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
        approved_by: null,
        approved_at: null,
        approval_notes: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', quotationId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to reject quotation');

    return data;
  },

  async markQuotationsForPriceUpdate(): Promise<any[]> {
    const adminUser = await isAdmin();
    
    if (!adminUser) {
      throw new Error('Only administrators can mark quotations for price updates');
    }

    const { data, error } = await supabase.rpc('mark_quotations_for_price_update');

    if (error) {
      console.error('Error marking quotations:', error);
      throw error;
    }

    return Array.isArray(data) ? data : [];
  }
};

export const paymentsApi = {
  async getByQuotationId(quotationId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('quotation_id', quotationId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async create(payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .insert(payment)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create payment');
    
    await quotationsApi.calculateTotals(payment.quotation_id);
    
    return data;
  },

  async update(id: string, payment: Partial<Omit<Payment, 'id' | 'quotation_id' | 'created_at' | 'updated_at'>>): Promise<Payment> {
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('quotation_id')
      .eq('id', id)
      .maybeSingle();

    const { data, error } = await supabase
      .from('payments')
      .update(payment)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update payment');
    
    if (existingPayment) {
      await quotationsApi.calculateTotals(existingPayment.quotation_id);
    }
    
    return data;
  },

  async delete(id: string): Promise<void> {
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('quotation_id')
      .eq('id', id)
      .maybeSingle();

    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    if (existingPayment) {
      await quotationsApi.calculateTotals(existingPayment.quotation_id);
    }
  }
};

export const commissioningInstallationApi = {
  async get(): Promise<CommissioningInstallation | null> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('commissioning_installation')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(commissioningData: Omit<CommissioningInstallation, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<CommissioningInstallation> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('commissioning_installation')
      .insert({ ...commissioningData, user_id: userId })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create commissioning installation');
    return data;
  },

  async update(id: string, updates: Partial<Omit<CommissioningInstallation, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<CommissioningInstallation> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('commissioning_installation')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update commissioning installation');
    return data;
  },

  async delete(id: string): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase
      .from('commissioning_installation')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }
};

export const deviceTemplatesApi = {
  async getAll(): Promise<DeviceTemplate[]> {
    const { data, error } = await supabase
      .from('device_templates')
      .select('*')
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getById(id: string): Promise<DeviceTemplate | null> {
    const { data, error } = await supabase
      .from('device_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getByCategory(category: string): Promise<DeviceTemplate[]> {
    const { data, error } = await supabase
      .from('device_templates')
      .select('*')
      .eq('category', category)
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async create(template: Omit<DeviceTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<DeviceTemplate> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('device_templates')
      .insert({ ...template, created_by: userId })
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Failed to create device template');
    return data;
  },

  async update(id: string, updates: Partial<Omit<DeviceTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'is_system'>>): Promise<DeviceTemplate> {
    const { data, error } = await supabase
      .from('device_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Failed to update device template');
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('device_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async bulkUpdatePrices(updates: Array<{ id: string; default_unit_price: number }>): Promise<void> {
    const promises = updates.map(({ id, default_unit_price }) =>
      supabase
        .from('device_templates')
        .update({ default_unit_price })
        .eq('id', id)
    );

    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);
    
    if (errors.length > 0) {
      throw new Error(`Failed to update ${errors.length} device prices`);
    }
  }
};

export const categorySettingsApi = {
  async getAll(): Promise<Record<string, string>> {
    const { data, error } = await supabase
      .from('category_settings')
      .select('category, display_label');

    if (error) throw error;
    
    const labels: Record<string, string> = {};
    data.forEach(item => {
      labels[item.category] = item.display_label;
    });
    return labels;
  },

  async update(category: string, label: string): Promise<void> {
    const { error } = await supabase
      .from('category_settings')
      .upsert({ category, display_label: label }, { onConflict: 'category' });

    if (error) throw error;
  },

  async updateBulk(updates: Array<{ category: string, display_label: string }>): Promise<void> {
    const { error } = await supabase
      .from('category_settings')
      .upsert(updates, { onConflict: 'category' });

    if (error) throw error;
  }
};

// Quotation Amendments API
export const quotationAmendmentsApi = {
  async getAll(quotationId: string) {
    const { data, error } = await supabase
      .from('quotation_amendments')
      .select('*, reviewed_by_profile:profiles!reviewed_by(email, username)')
      .eq('quotation_id', quotationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async create(quotationId: string, changes: any) {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('quotation_amendments')
      .insert({
        quotation_id: quotationId,
        user_id: userId,
        changes,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: 'approved' | 'rejected') {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('quotation_amendments')
      .update({
        status,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// Export price history API
export { priceHistoryApi } from './priceHistoryApi';

// Quotation status audit API
export const quotationStatusAuditApi = {
  /** Record a status transition. Call after successfully updating quotation.status. */
  async record(quotationId: string, fromStatus: string | null, toStatus: string, notes?: string) {
    const userId = await getUserId();
    const { error } = await supabase
      .from('quotation_status_audit')
      .insert({
        quotation_id: quotationId,
        changed_by: userId,
        from_status: fromStatus,
        to_status: toStatus,
        notes: notes ?? null,
      });
    if (error) console.error('[StatusAudit] Failed to record transition:', error);
  },

  /** Fetch the full audit trail for a single quotation, newest first. */
  async getForQuotation(quotationId: string) {
    const { data, error } = await supabase
      .from('quotation_status_audit')
      .select('*')
      .eq('quotation_id', quotationId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /** Fetch all audit events (admin only), newest first, with optional limit. */
  async getAll(limit = 200) {
    const { data, error } = await supabase
      .from('quotation_status_audit')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },
};

// ── ICU Types ─────────────────────────────────────────────────────────────
export interface ICUSettings {
  id: string;
  icu_rate: number;
  ic_minimum: number;
  updated_by: string | null;
  updated_at: string;
}

export type ICUPricingMode = 'formula' | 'fixed';

export interface ICUItem {
  id: string;
  label: string;
  device_category: string;
  gang: string | null;
  switch_type: string | null;
  icu_value: number;
  pricing_mode: ICUPricingMode;
  fixed_price: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ── ICU Settings API ───────────────────────────────────────────────────────
export const icuSettingsApi = {
  async get(): Promise<ICUSettings | null> {
    const { data, error } = await supabase
      .from('icu_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async update(rate: number, minimum: number): Promise<ICUSettings> {
    const userId = await getUserId();
    // Get the single row id first
    const existing = await icuSettingsApi.get();
    if (!existing) throw new Error('ICU settings row not found');
    const { data, error } = await supabase
      .from('icu_settings')
      .update({ icu_rate: rate, ic_minimum: minimum, updated_by: userId })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ── ICU Items API ──────────────────────────────────────────────────────────
export const icuItemsApi = {
  async list(): Promise<ICUItem[]> {
    const { data, error } = await supabase
      .from('icu_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('label', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async listActive(): Promise<ICUItem[]> {
    const { data, error } = await supabase
      .from('icu_items')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(payload: Omit<ICUItem, 'id' | 'created_at' | 'updated_at'>): Promise<ICUItem> {
    const { data, error } = await supabase
      .from('icu_items')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: Partial<Omit<ICUItem, 'id' | 'created_at' | 'updated_at'>>): Promise<ICUItem> {
    const { data, error } = await supabase
      .from('icu_items')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('icu_items').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Types ──────────────────────────────────────────────────────────────────
export interface ExpenseCategory {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  category_id: string | null;
  expense_date: string;
  vendor: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  expense_categories?: { name: string } | null;
}

// ── Expense Categories API ─────────────────────────────────────────────────
export const expenseCategoriesApi = {
  async list(): Promise<ExpenseCategory[]> {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(name: string, description?: string): Promise<ExpenseCategory> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({ name: name.trim(), description: description?.trim() ?? null, is_default: false, created_by: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, name: string, description?: string): Promise<ExpenseCategory> {
    const { data, error } = await supabase
      .from('expense_categories')
      .update({ name: name.trim(), description: description?.trim() ?? null })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('expense_categories')
      .delete()
      .eq('id', id)
      .eq('is_default', false);
    if (error) throw error;
  },
};

// ── Expenses API ───────────────────────────────────────────────────────────
export const expensesApi = {
  async list(): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, expense_categories(name)')
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(payload: Omit<Expense, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'expense_categories'>): Promise<Expense> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...payload, created_by: userId })
      .select('*, expense_categories(name)')
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: Partial<Omit<Expense, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'expense_categories'>>): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .update(payload)
      .eq('id', id)
      .select('*, expense_categories(name)')
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
  },

  /** Sum of all expense amounts — used by analytics */
  async totalAmount(): Promise<number> {
    const { data, error } = await supabase
      .from('expenses')
      .select('amount');
    if (error) throw error;
    return (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  },
};
