export type SupportedLanguage = 'en' | 'hi' | 'ta';

export interface Translations {
  appName: string;
  appSubtitle: string;
  airGappedTag: string;
  tabDashboard: string;
  tabGraph: string;
  tabOverlaps: string;
  tabAudit: string;
  tabAnalytics: string;
  tabCitizenTracking: string;
  tabInstitutionPortal: string;
  btnFileGrievance: string;
  btnBulkImport: string;
  btnOfficerLogin: string;
  btnSwitchRole: string;
  btnSimulateTamper: string;
  btnRestoreIntegrity: string;
  statusReceived: string;
  statusUnderScrutiny: string;
  statusJointInquiry: string;
  statusDisposed: string;
  statusEscalated: string;
  filterRegion: string;
  filterBureau: string;
  filterStatus: string;
  searchPlaceholder: string;
  slaBreachAlert: string;
  offlineBanner: string;
  fontSize: string;
  language: string;
  smsSimulator: string;
  notifications: string;
  precedents: string;
  aiAssistant: string;
}

export const TRANSLATIONS: Record<SupportedLanguage, Translations> = {
  en: {
    appName: 'AICTE SAMANVAY (समन्वय)',
    appSubtitle: 'Air-Gapped Cross-Bureau Grievance Harmonization Platform',
    airGappedTag: '100% Air-Gapped Secure Architecture',
    tabDashboard: 'Harmonization Dashboard',
    tabGraph: 'Conflict Network Graph',
    tabOverlaps: 'Cross-Bureau Overlaps',
    tabAudit: 'Cryptographic Audit Chain',
    tabAnalytics: 'Predictive Analytics',
    tabCitizenTracking: 'Citizen Grievance Tracking',
    tabInstitutionPortal: 'Institution Response Portal',
    btnFileGrievance: '+ File Grievance',
    btnBulkImport: 'Bulk CSV Ingestion',
    btnOfficerLogin: 'Officer Enterprise Login',
    btnSwitchRole: 'Switch Demo Persona',
    btnSimulateTamper: 'Simulate Tamper',
    btnRestoreIntegrity: 'Restore Cryptographic Integrity',
    statusReceived: 'Received',
    statusUnderScrutiny: 'Under Scrutiny',
    statusJointInquiry: 'Joint Inquiry',
    statusDisposed: 'Disposed',
    statusEscalated: 'Escalated',
    filterRegion: 'Filter Region',
    filterBureau: 'Filter Bureau',
    filterStatus: 'Filter Status',
    searchPlaceholder: 'Search by Case ID, Institution, Subject...',
    slaBreachAlert: 'Statutory SLA Breach Escalation',
    offlineBanner: 'AIR-GAPPED HIGH-ASSURANCE ISOLATION - Backend Offline',
    fontSize: 'Text Size',
    language: 'Language',
    smsSimulator: 'SMS / Email Simulator',
    notifications: 'Regulatory Alerts',
    precedents: 'Regulatory Precedents',
    aiAssistant: 'AI Regulatory Assistant'
  },
  hi: {
    appName: 'एआईसीटीई समन्वय',
    appSubtitle: 'एयर-गैप्ड क्रॉस-ब्यूरो शिकायत निवारण एवं समन्वय मंच',
    airGappedTag: '१००% एयर-गैप्ड सुरक्षित संरचना',
    tabDashboard: 'समन्वय डैशबोर्ड',
    tabGraph: 'संस्थागत विवाद नेटवर्क',
    tabOverlaps: 'क्रॉस-ब्यूरो ओवरलैप',
    tabAudit: 'क्रिप्टोग्राफ़िक ऑडिट चेन',
    tabAnalytics: 'पूर्वानुमान एवं विश्लेषण',
    tabCitizenTracking: 'नागरिक शिकायत ट्रैकिंग',
    tabInstitutionPortal: 'संस्थान अनुपालन पोर्टल',
    btnFileGrievance: '+ नई शिकायत दर्ज करें',
    btnBulkImport: 'बल्क सीएसवी आयात',
    btnOfficerLogin: 'अधिकारी लॉगिन',
    btnSwitchRole: 'डेमो भूमिका बदलें',
    btnSimulateTamper: 'छेड़छाड़ का अनुकरण करें',
    btnRestoreIntegrity: 'अखंडता पुनर्स्थापित करें',
    statusReceived: 'प्राप्त हुआ',
    statusUnderScrutiny: 'जांच के अधीन',
    statusJointInquiry: 'संयुक्त जांच',
    statusDisposed: 'निस्तारित',
    statusEscalated: 'एस्केलेटेड (शीर्ष प्रकोष्ठ)',
    filterRegion: 'क्षेत्र चुनें',
    filterBureau: 'ब्यूरो चुनें',
    filterStatus: 'स्थिति चुनें',
    searchPlaceholder: 'केस आईडी, संस्थान का नाम या विषय खोजें...',
    slaBreachAlert: 'सांविधिक समय-सीमा उल्लंघन चेतावनी',
    offlineBanner: 'एयर-गैप्ड उच्च-सुरक्षा पृथक्करण - बैकएंड ऑफ़लाइन',
    fontSize: 'फ़ॉन्ट आकार',
    language: 'भाषा',
    smsSimulator: 'एसएमएस / ईमेल सिम्युलेटर',
    notifications: 'नियामक सूचनाएं',
    precedents: 'नियामक पूर्व-निर्णय',
    aiAssistant: 'एआई नियामक सहायक'
  },
  ta: {
    appName: 'ஏஐசிடிஇ சமன்வய் (ஒருங்கிணைப்பு)',
    appSubtitle: 'துறைமுகங்களுக்கிடையேயான குறைதீர்க்கும் தளம்',
    airGappedTag: '100% இணையற்ற முழுப் பாதுகாப்பு கட்டமைப்பு',
    tabDashboard: 'ஒருங்கிணைப்பு கட்டுப்பாட்டுப் பலகை',
    tabGraph: 'நிறுவன முரண்பாடு வரைபடம்',
    tabOverlaps: 'துறைமுக இரட்டைப் பதிவுகள்',
    tabAudit: 'கிரிப்டோகிராஃபிக் தணிக்கை சங்கிலி',
    tabAnalytics: 'முன்கணிப்பு பகுப்பாய்வு',
    tabCitizenTracking: 'குடிமக்கள் குறை கண்காணிப்பு',
    tabInstitutionPortal: 'நிறுவன பதிலளிப்பு தளம்',
    btnFileGrievance: '+ புதிய புகார் பதிவு செய்',
    btnBulkImport: 'மொத்த CSV பதிவேற்றம்',
    btnOfficerLogin: 'அதிகாரி உள்நுழைவு',
    btnSwitchRole: 'மாதிரி பொறுப்பு மாற்றம்',
    btnSimulateTamper: 'திருத்தத்தை சோதி',
    btnRestoreIntegrity: 'நம்பகத்தன்மையை மீட்டெடு',
    statusReceived: 'பெறப்பட்டது',
    statusUnderScrutiny: 'ஆய்வில் உள்ளது',
    statusJointInquiry: 'கூட்டு விசாரணை',
    statusDisposed: 'தீர்க்கப்பட்டது',
    statusEscalated: 'உயர்மட்டத்திற்கு அனுப்பப்பட்டது',
    filterRegion: 'மண்டலத்தைத் தேர்ந்தெடு',
    filterBureau: 'பிரிவைத் தேர்ந்தெடு',
    filterStatus: 'நிலையைத் தேர்ந்தெடு',
    searchPlaceholder: 'வழக்கு எண், கல்லூரி பெயர் அல்லது விவரம்...',
    slaBreachAlert: 'சட்டப்பூர்வ காலக்கெடு மீறல் எச்சரிக்கை',
    offlineBanner: 'முழுமையான தனிமைப்படுத்தப்பட்ட பாதுகாப்பு முறைமை',
    fontSize: 'எழுத்து அளவு',
    language: 'மொழி',
    smsSimulator: 'எஸ்எம்எஸ் / மின்னஞ்சல் சிமுலேட்டர்',
    notifications: 'ஒழுங்குமுறை எச்சரிக்கைகள்',
    precedents: 'முந்தைய தீர்ப்புகள்',
    aiAssistant: 'AI சட்ட உதவியாளர்'
  }
};

export function t(key: keyof Translations, lang: SupportedLanguage = 'en'): string {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || '';
}
