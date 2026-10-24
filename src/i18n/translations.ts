import type { QuotationLanguage, DeviceCategory } from '@/types/types';

export const translations = {
  en: {
    // Device Categories
    mini_switch: 'Mini Light Switch',
    mini_shutter_switch: 'Mini Light Switch',
    touch_switch: 'Touch Light Switch',
    touch_shutter_switch: 'Touch Light Switch',
    shutter_switch: 'Mini Shutter Switch',
    smart_shutter_switch: 'Touch Shutter Switch',
    curtain_switch: 'Mini Shutter/Curtain Switch',
    curtain_motor: 'Curtain Motor',
    curtain_rail: 'Curtain Rail',
    roller_blind_motor: 'Roller Blind Motor',
    smart_plug: 'Smart Plug',
    ir_remote: 'IR Remote',
    gas_sensor: 'Gas Sensor',
    water_leak_sensor: 'Water Leak Sensor',
    motion_sensor: 'Motion Sensor',
    presence_sensor: 'Presence Sensor',
    smoke_sensor: 'Smoke Sensor',
    gas_valve: 'Gas Valve',
    water_valve: 'Water Valve',
    intercom: 'Intercom',
    camera: 'Camera',
    zigbee_hub: 'Zigbee Hub',
    matter_hub: 'Matter Hub',
    access_point: 'Access Point',
    repeater: 'Repeater',
    mesh_wifi: 'Mesh WiFi',
    network_switch: 'Network Switch',
    cat6_cable: 'CAT6 Cable',
    bracket: 'Bracket',
    nvr: 'NVR',
    hdd: 'HDD',
    custom_device: 'Custom Device',
    
    // Protocols
    zigbee: 'Zigbee',
    matter: 'Matter',
    wifi: 'WiFi',
    wired: 'Wired',
    lan: 'LAN',
    
    // UI Labels
    quotation: 'Quotation',
    invoice: 'Invoice',
    project_code: 'Project Code',
    client_name: 'Client Name',
    client_address: 'Client Address',
    client_phone: 'Client Phone',
    room: 'Room',
    device: 'Device',
    category: 'Category',
    protocol: 'Protocol',
    quantity: 'Quantity',
    unit_price: 'Unit Price',
    vat: 'VAT',
    subtotal: 'Subtotal',
    total: 'Total',
    commissioning: 'Commissioning',
    installation: 'Installation',
    total_amount: 'Total Amount',
    paid: 'Paid',
    remaining: 'Remaining',
    status: 'Status',
    created_at: 'Created At',
    updated_at: 'Updated At',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    add: 'Add',
    language: 'Language',
    english: 'English',
    arabic: 'Arabic',
    switch_language: 'Switch Language',
    convert_to: 'Convert to',
    
    // Gang types
    '1_gang': '1 Gang',
    '2_gang': '2 Gang',
    '3_gang': '3 Gang',
    '4_gang': '4 Gang',
    
    // Camera types
    indoor: 'Indoor',
    outdoor: 'Outdoor',
    
    // Resolutions
    '2mp': '2 MP',
    '3mp': '3 MP',
    '4mp': '4 MP',
    '6mp': '6 MP',
    
    // Intercom types
    doorbell: 'Doorbell',
    indoor_station: 'Indoor Station',
    
    // Misc
    ports: 'ports',
    name: 'Name',
  },
  ar: {
    // Device Categories
    mini_switch: 'مفتاح إضاءة ذكي صغير',
    mini_shutter_switch: 'مفتاح إضاءة ذكي صغير',
    touch_switch: 'مفتاح لمس',
    touch_shutter_switch: 'مفتاح لمس',
    shutter_switch: 'مفتاح ستارة/ستائر صغير',
    smart_shutter_switch: 'مفتاح ستارة ذكي',
    curtain_switch: 'مفتاح ستارة/ستائر صغير',
    curtain_motor: 'محرك ستائر',
    curtain_rail: 'قضيب ستائر',
    roller_blind_motor: 'محرك ستائر رول',
    smart_plug: 'قابس ذكي',
    ir_remote: 'جهاز تحكم عن بعد',
    gas_sensor: 'مستشعر غاز',
    water_leak_sensor: 'مستشعر تسرب المياه',
    motion_sensor: 'مستشعر حركة',
    presence_sensor: 'مستشعر وجود',
    smoke_sensor: 'مستشعر دخان',
    gas_valve: 'صمام غاز',
    water_valve: 'صمام مياه',
    intercom: 'انتركم',
    camera: 'كاميرا',
    zigbee_hub: 'مركز زيجبي',
    matter_hub: 'مركز ماتر',
    access_point: 'نقطة وصول',
    repeater: 'مكرر',
    mesh_wifi: 'شبكة واي فاي',
    network_switch: 'محول شبكة',
    cat6_cable: 'كابل CAT6',
    bracket: 'حامل',
    nvr: 'مسجل فيديو',
    hdd: 'قرص صلب',
    custom_device: 'جهاز مخصص',
    
    // Protocols
    zigbee: 'زيجبي',
    matter: 'ماتر',
    wifi: 'واي فاي',
    wired: 'سلكي',
    lan: 'شبكة محلية',
    
    // UI Labels
    quotation: 'عرض سعر',
    invoice: 'فاتورة',
    project_code: 'رمز المشروع',
    client_name: 'اسم العميل',
    client_address: 'عنوان العميل',
    client_phone: 'هاتف العميل',
    room: 'غرفة',
    device: 'جهاز',
    category: 'الفئة',
    protocol: 'البروتوكول',
    quantity: 'الكمية',
    unit_price: 'سعر الوحدة',
    vat: 'ضريبة القيمة المضافة',
    subtotal: 'المجموع الفرعي',
    total: 'الإجمالي',
    commissioning: 'التشغيل',
    installation: 'التركيب',
    total_amount: 'المبلغ الإجمالي',
    paid: 'المدفوع',
    remaining: 'المتبقي',
    status: 'الحالة',
    created_at: 'تاريخ الإنشاء',
    updated_at: 'تاريخ التحديث',
    edit: 'تعديل',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    add: 'إضافة',
    language: 'اللغة',
    english: 'الإنجليزية',
    arabic: 'العربية',
    switch_language: 'تبديل اللغة',
    convert_to: 'تحويل إلى',
    
    // Gang types
    '1_gang': '١ مفتاح',
    '2_gang': '٢ مفتاح',
    '3_gang': '٣ مفتاح',
    '4_gang': '٤ مفتاح',
    
    // Camera types
    indoor: 'داخلي',
    outdoor: 'خارجي',
    
    // Resolutions
    '2mp': '٢ ميجابكسل',
    '3mp': '٣ ميجابكسل',
    '4mp': '٤ ميجابكسل',
    '6mp': '٦ ميجابكسل',
    
    // Intercom types
    doorbell: 'جرس الباب',
    indoor_station: 'محطة داخلية',
    
    // Misc
    ports: 'منافذ',
    name: 'الاسم',
  }
};

export function translate(key: string, language: QuotationLanguage = 'en'): string {
  return translations[language][key as keyof typeof translations.en] || key;
}

export function translateCategory(category: DeviceCategory, language: QuotationLanguage = 'en'): string {
  return translate(category, language);
}

export function translateProtocol(protocol: string | null, language: QuotationLanguage = 'en'): string {
  if (!protocol) return '';
  return translate(protocol.toLowerCase(), language);
}
