import { useRef, useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { roomsApi, devicesApi, devicePricesApi } from '@/db/api';
import { mapRow, parseSurveyFile, roomKey, roomLabel } from '@/utils/surveyImport';
import type { Device, Room } from '@/types/types';
import type { ClientInfoSectionRef } from './ClientInfoSection';

interface Props {
  clientInfoRef: React.RefObject<ClientInfoSectionRef>;
  onImported: (rooms: Room[], devices: Device[]) => void;
  disabled?: boolean;
}

// "رفع معاينة": reads a PROSMART_SURVEY .xlsx from prosmart-field and builds the quotation draft
// (client info + one room per surveyed room + devices with prices from the price list).
export default function SurveyImportButton({ clientInfoRef, onImported, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const { info, rows } = await parseSurveyFile(file);
      if (!rows.length) throw new Error('الملف مفيهوش أي أجهزة.');

      // 1) rooms (one per section+floor+room)
      const roomByKey = new Map<string, Room>();
      for (const r of rows) {
        const k = roomKey(r);
        if (!roomByKey.has(k)) roomByKey.set(k, await roomsApi.create(roomLabel(r)));
      }

      // 2) devices (price from the price list; 0 when there is none)
      const devices: Device[] = [];
      let custom = 0;
      for (const r of rows) {
        const spec = mapRow(r, info);
        if (spec.category === 'custom_device') custom++;
        let unit_price = 0;
        if (spec.category !== 'custom_device') {
          try { unit_price = await devicePricesApi.getPrice(spec.category, spec.protocol, spec.gang ?? null, spec.intercom_type ?? null); } catch { /* keep 0 */ }
        }
        devices.push(
          await devicesApi.create({
            category: spec.category,
            room_id: roomByKey.get(roomKey(r))!.id,
            protocol: spec.protocol,
            quantity: r.qty,
            unit_price,
            vat_rate: 0,
            gang: spec.gang,
            intercom_type: spec.intercom_type,
            camera_type: spec.camera_type,
            camera_resolution: spec.camera_resolution,
            nvr_channels: spec.nvr_channels,
            hdd_capacity: spec.hdd_capacity,
            custom_name: spec.custom_name,
          }),
        );
      }

      // 3) client data
      const cur = clientInfoRef.current?.getClientInfo();
      clientInfoRef.current?.setClientInfoFromQuotation({
        client_name: info.customer,
        client_address: info.location || null,
        client_phone: cur?.phone_number || null,
        project_code: cur?.project_code || (info.order_no ? `SV-${info.order_no}` : `SV-${Date.now()}`),
      });

      onImported([...roomByKey.values()], devices);
      toast({
        title: 'تم استيراد المعاينة',
        description: `${roomByKey.size} غرفة · ${devices.length} صنف${custom ? ` · ${custom} صنف اتضاف كـ Custom وسعره 0 (راجعه)` : ''}`,
      });
    } catch (err) {
      toast({ title: 'فشل استيراد المعاينة', description: err instanceof Error ? err.message : 'حصل خطأ', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={handle} />
      <Button type="button" variant="outline" disabled={busy || disabled} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
        رفع معاينة
      </Button>
    </>
  );
}
