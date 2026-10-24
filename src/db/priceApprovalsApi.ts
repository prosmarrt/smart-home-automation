import { supabase } from './supabase';
import type { PriceApproval, ApprovalStatus } from '@/types/types';

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  return user.id;
}

async function isAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  
  return data?.role === 'admin';
}

export const priceApprovalsApi = {
  async submit(approval: {
    device_price_id: string;
    device_name: string;
    device_category: string;
    old_price: number;
    new_price: number;
    reason?: string;
  }): Promise<PriceApproval> {
    const userId = await getUserId();

    const { data, error } = await supabase
      .from('price_approvals')
      .insert({
        device_price_id: approval.device_price_id,
        device_name: approval.device_name,
        device_category: approval.device_category,
        old_price: approval.old_price,
        new_price: approval.new_price,
        requested_by: userId,
        reason: approval.reason || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to submit price approval request');

    return data;
  },

  async approve(approvalId: string, notes?: string): Promise<PriceApproval> {
    const userId = await getUserId();
    const adminUser = await isAdmin();

    if (!adminUser) {
      throw new Error('Only administrators can approve price changes');
    }

    // Get the approval request
    const { data: approval } = await supabase
      .from('price_approvals')
      .select('*')
      .eq('id', approvalId)
      .maybeSingle();

    if (!approval) throw new Error('Approval request not found');
    if (approval.status !== 'pending') throw new Error('Approval request already processed');

    // Update approval status
    const { data, error } = await supabase
      .from('price_approvals')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        approval_notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', approvalId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to approve price change');

    // Update device price with the new price
    const { error: priceError } = await supabase
      .from('device_prices')
      .update({
        unit_price: approval.new_price,
        pending_price: null,
        pending_approval: false,
        price_change_requested_by: null,
        price_change_requested_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', approval.device_price_id);

    if (priceError) throw priceError;

    // Mark unpaid quotations (no payments made) as having pending price updates
    await supabase
      .from('quotations')
      .update({ pending_price_update: true })
      .in('status', ['Draft', 'Approved'])
      .eq('total_paid', 0)
      .is('update_ignored_at', null)
      .is('update_applied_at', null);

    return data;
  },

  async reject(approvalId: string, notes?: string): Promise<PriceApproval> {
    const userId = await getUserId();
    const adminUser = await isAdmin();

    if (!adminUser) {
      throw new Error('Only administrators can reject price changes');
    }

    // Get the approval request
    const { data: approval } = await supabase
      .from('price_approvals')
      .select('*')
      .eq('id', approvalId)
      .maybeSingle();

    if (!approval) throw new Error('Approval request not found');
    if (approval.status !== 'pending') throw new Error('Approval request already processed');

    // Update approval status
    const { data, error } = await supabase
      .from('price_approvals')
      .update({
        status: 'rejected',
        rejected_by: userId,
        rejected_at: new Date().toISOString(),
        approval_notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', approvalId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to reject price change');

    // Clear pending approval from device price
    const { error: priceError } = await supabase
      .from('device_prices')
      .update({
        pending_price: null,
        pending_approval: false,
        price_change_requested_by: null,
        price_change_requested_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', approval.device_price_id);

    if (priceError) throw priceError;

    return data;
  },

  async getPending(): Promise<PriceApproval[]> {
    const { data, error } = await supabase
      .from('price_approvals')
      .select('*')
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getAll(status?: ApprovalStatus): Promise<PriceApproval[]> {
    let query = supabase
      .from('price_approvals')
      .select('*')
      .order('requested_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getByDevicePrice(devicePriceId: string): Promise<PriceApproval[]> {
    const { data, error } = await supabase
      .from('price_approvals')
      .select('*')
      .eq('device_price_id', devicePriceId)
      .order('requested_at', { ascending: false });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }
};
