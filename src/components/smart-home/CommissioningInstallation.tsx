import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Wrench, Save, Percent, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/db/supabase';
import { getUserId } from '@/db/api';
import type { DiscountType } from '@/types/types';

interface CommissioningData {
  id?: string;
  commissioning_fee: number;
  visit_fee: number;
  installation_fee: number;
  commissioning_notes: string;
  installation_notes: string;
  estimated_days: number;
  technicians_required: number;
  vat_percentage: number;
  discount_type: DiscountType | null;
  discount_value: number;
}

export default function CommissioningInstallation() {
  const [data, setData] = useState<CommissioningData>({
    commissioning_fee: 0,
    visit_fee: 0,
    installation_fee: 0,
    commissioning_notes: '',
    installation_notes: '',
    estimated_days: 1,
    technicians_required: 1,
    vat_percentage: 0,
    discount_type: null,
    discount_value: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userId = await getUserId();
      const { data: result, error } = await supabase
        .from('commissioning_installation')
        .select('*')
        .eq('user_id', userId)
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (result) {
        setData(result);
      }
    } catch (error) {
      console.error('Error loading commissioning data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const userId = await getUserId();
      
      if (data.id) {
        const { error } = await supabase
          .from('commissioning_installation')
          .update({
            commissioning_fee: data.commissioning_fee,
            visit_fee: data.visit_fee,
            installation_fee: data.installation_fee,
            commissioning_notes: data.commissioning_notes,
            installation_notes: data.installation_notes,
            estimated_days: data.estimated_days,
            technicians_required: data.technicians_required,
            vat_percentage: data.vat_percentage,
            discount_type: data.discount_type,
            discount_value: data.discount_value
          })
          .eq('id', data.id)
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        const { data: newData, error } = await supabase
          .from('commissioning_installation')
          .insert({
            user_id: userId,
            commissioning_fee: data.commissioning_fee,
            visit_fee: data.visit_fee,
            installation_fee: data.installation_fee,
            commissioning_notes: data.commissioning_notes,
            installation_notes: data.installation_notes,
            estimated_days: data.estimated_days,
            technicians_required: data.technicians_required,
            vat_percentage: data.vat_percentage,
            discount_type: data.discount_type,
            discount_value: data.discount_value
          })
          .select()
          .single();

        if (error) throw error;
        if (newData) {
          setData(newData);
        }
      }

      toast({
        title: 'Success',
        description: 'Commissioning and installation data saved successfully.'
      });
    } catch (error) {
      console.error('Error saving data:', error);
      toast({
        title: 'Error',
        description: 'Failed to save data. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const totalFees = data.commissioning_fee + data.visit_fee + data.installation_fee;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle>Commissioning Services</CardTitle>
          </div>
          <CardDescription>System configuration and testing services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commissioning-fee">Commissioning Fee (EGP)</Label>
              <Input
                id="commissioning-fee"
                type="number"
                min="0"
                step="0.01"
                value={data.commissioning_fee}
                onChange={(e) => setData({ ...data, commissioning_fee: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visit-fee">Visit Fee (EGP)</Label>
              <Input
                id="visit-fee"
                type="number"
                min="0"
                step="0.01"
                value={data.visit_fee}
                onChange={(e) => setData({ ...data, visit_fee: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimated-days">Estimated Days</Label>
              <Input
                id="estimated-days"
                type="number"
                min="1"
                value={data.estimated_days}
                onChange={(e) => setData({ ...data, estimated_days: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="commissioning-notes">Commissioning Notes</Label>
            <Textarea
              id="commissioning-notes"
              placeholder="System testing, configuration, network setup, device pairing..."
              rows={3}
              value={data.commissioning_notes}
              onChange={(e) => setData({ ...data, commissioning_notes: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            <CardTitle>Installation Services</CardTitle>
          </div>
          <CardDescription>Physical installation and wiring services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="installation-fee">Installation Fee (EGP)</Label>
              <Input
                id="installation-fee"
                type="number"
                min="0"
                step="0.01"
                value={data.installation_fee}
                onChange={(e) => setData({ ...data, installation_fee: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="technicians">Technicians Required</Label>
              <Input
                id="technicians"
                type="number"
                min="1"
                value={data.technicians_required}
                onChange={(e) => setData({ ...data, technicians_required: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="installation-notes">Installation Notes</Label>
            <Textarea
              id="installation-notes"
              placeholder="Device mounting, cable routing, electrical work, finishing..."
              rows={3}
              value={data.installation_notes}
              onChange={(e) => setData({ ...data, installation_notes: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-foreground font-medium">Commissioning Fee:</span>
              <span className="text-foreground font-semibold">EGP {data.commissioning_fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground font-medium">Installation Fee:</span>
              <span className="text-foreground font-semibold">EGP {data.installation_fee.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-foreground font-bold text-lg">Total Service Fees:</span>
              <span className="text-primary font-bold text-lg">EGP {totalFees.toFixed(2)}</span>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vat-percentage">VAT Percentage (%)</Label>
              <Input
                id="vat-percentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={data.vat_percentage}
                onChange={(e) => setData({ ...data, vat_percentage: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-sm text-muted-foreground">
                VAT will be applied to the grand total (devices + services)
              </p>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-primary" />
                <Label className="text-base font-semibold">Discount</Label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount-type">Discount Type</Label>
                  <Select
                    value={data.discount_type || 'none'}
                    onValueChange={(value) => {
                      if (value === 'none') {
                        setData({ ...data, discount_type: null, discount_value: 0 });
                      } else {
                        setData({ ...data, discount_type: value as DiscountType });
                      }
                    }}
                  >
                    <SelectTrigger id="discount-type">
                      <SelectValue placeholder="Select discount type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Discount</SelectItem>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (EGP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {data.discount_type && (
                  <div className="space-y-2">
                    <Label htmlFor="discount-value">
                      {data.discount_type === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount (EGP)'}
                    </Label>
                    <Input
                      id="discount-value"
                      type="number"
                      min="0"
                      max={data.discount_type === 'percentage' ? '100' : undefined}
                      step="0.01"
                      value={data.discount_value}
                      onChange={(e) => setData({ ...data, discount_value: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                )}
              </div>

              {data.discount_type && data.discount_value > 0 && (
                <p className="text-sm text-muted-foreground">
                  {data.discount_type === 'percentage' 
                    ? `A ${data.discount_value}% discount will be applied to the total amount`
                    : `A discount of EGP ${data.discount_value.toFixed(2)} will be applied to the total amount`
                  }
                </p>
              )}
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
