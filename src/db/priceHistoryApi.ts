import { supabase } from './supabase';
import type { PriceHistory, PriceChangeType } from '@/types/types';

export const priceHistoryApi = {
  /**
   * Log a price change
   */
  async log(data: {
    device_price_id?: string;
    quotation_id?: string;
    device_name: string;
    device_category: string;
    old_price: number;
    new_price: number;
    change_type: PriceChangeType;
    change_reason?: string;
  }): Promise<PriceHistory> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: history, error } = await supabase
      .from('price_history')
      .insert({
        device_price_id: data.device_price_id || null,
        quotation_id: data.quotation_id || null,
        device_name: data.device_name,
        device_category: data.device_category,
        old_price: data.old_price,
        new_price: data.new_price,
        change_type: data.change_type,
        change_reason: data.change_reason || null,
        changed_by: user?.id || null
      })
      .select()
      .single();

    if (error) throw error;
    return history;
  },

  /**
   * Get price history for a specific device
   */
  async getByDevice(devicePriceId: string): Promise<PriceHistory[]> {
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('device_price_id', devicePriceId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get price history for a specific quotation
   */
  async getByQuotation(quotationId: string): Promise<PriceHistory[]> {
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('quotation_id', quotationId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get all price history with optional filters
   */
  async getAll(filters?: {
    startDate?: string;
    endDate?: string;
    changeType?: PriceChangeType;
    deviceCategory?: string;
  }): Promise<PriceHistory[]> {
    let query = supabase
      .from('price_history')
      .select('*');

    if (filters?.startDate) {
      query = query.gte('changed_at', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('changed_at', filters.endDate);
    }
    if (filters?.changeType) {
      query = query.eq('change_type', filters.changeType);
    }
    if (filters?.deviceCategory) {
      query = query.eq('device_category', filters.deviceCategory);
    }

    query = query.order('changed_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Revert device price to a historical value
   */
  async revertToPrice(
    devicePriceId: string,
    targetHistoryId: string,
    reason: string
  ): Promise<{ success: boolean; newHistory: PriceHistory }> {
    // Get the target historical price
    const { data: targetHistory, error: historyError } = await supabase
      .from('price_history')
      .select('*')
      .eq('id', targetHistoryId)
      .single();

    if (historyError) throw historyError;

    // Get current price
    const { data: currentPrice, error: priceError } = await supabase
      .from('device_prices')
      .select('unit_price, category, device_name, brand, model')
      .eq('id', devicePriceId)
      .single();

    if (priceError) throw priceError;

    // Update the device price
    const { error: updateError } = await supabase
      .from('device_prices')
      .update({ 
        unit_price: targetHistory.new_price,
        updated_at: new Date().toISOString()
      })
      .eq('id', devicePriceId);

    if (updateError) throw updateError;

    // Log the reversion
    const deviceName = currentPrice.device_name || 
      `${currentPrice.brand || ''} ${currentPrice.model || ''}`.trim() ||
      'Unknown Device';

    const newHistory = await this.log({
      device_price_id: devicePriceId,
      device_name: deviceName,
      device_category: currentPrice.category,
      old_price: currentPrice.unit_price,
      new_price: targetHistory.new_price,
      change_type: 'revert',
      change_reason: `${reason} (Reverted from ${new Date(targetHistory.changed_at).toLocaleDateString()})`
    });

    return { success: true, newHistory };
  },

  /**
   * Get price trend data for charting
   */
  async getPriceTrend(devicePriceId: string, days: number = 30): Promise<Array<{
    date: string;
    price: number;
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('price_history')
      .select('changed_at, new_price')
      .eq('device_price_id', devicePriceId)
      .gte('changed_at', startDate.toISOString())
      .order('changed_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(item => ({
      date: item.changed_at,
      price: item.new_price
    }));
  }
};
