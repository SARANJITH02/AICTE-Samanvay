const fs = require('fs');
const path = require('path');

const institutions = [
  { pid: "1-10972411", name: "Delhi Institute of Advanced Studies", region: "Northern" },
  { pid: "1-48920194", name: "PSG College of Technology", region: "Southern" },
  { pid: "1-77382910", name: "College of Engineering Pune", region: "Western" },
  { pid: "1-33910284", name: "Jadavpur University Engineering", region: "Eastern" },
  { pid: "1-99281034", name: "Vellore Institute of Technology", region: "Southern" },
  { pid: "1-88492011", name: "Thapar Institute of Engineering", region: "Northern" },
  { pid: "1-66382019", name: "Coimbatore Institute of Technology", region: "Southern" },
  { pid: "1-55281044", name: "Birla Institute of Technology Mesra", region: "Eastern" },
  { pid: "1-44182955", name: "National Institute of Engineering Mysore", region: "South-Western" },
  { pid: "1-22918477", name: "Sardar Vallabhbhai National Institute", region: "Western" }
];

const categories = [
  "Fee Dispute",
  "Document Withholding",
  "Admission Anomaly",
  "Faculty Norms",
  "Infrastructure Deficit",
  "Harassment / Disciplinary"
];

const englishOverlapTemplates = [
  {
    cat: "Fee Dispute",
    textA: "Institution withheld caution deposit of Rs. {amount} post graduation despite clearance.",
    textB: "Mass complaint regarding non-refund of caution money amounting to Rs {amount} in violation of APH clause 13.4.",
    sim: 0.89
  },
  {
    cat: "Document Withholding",
    textA: "College refuses to return original 10th and 12th certificates after admission withdrawal.",
    textB: "Non-compliance report regarding illegal retention of original marksheet documents under bond penalty.",
    sim: 0.88
  },
  {
    cat: "Admission Anomaly",
    textA: "Management admitted {num} excess students beyond sanctioned intake in Computer Science.",
    textB: "Scrutiny audit anomaly: {num} unapproved seats filled exceeding AICTE approved intake quota.",
    sim: 0.91
  },
  {
    cat: "Faculty Norms",
    textA: "Assistant Professor original PhD certificates and service book retained by college upon resignation.",
    textB: "Faculty memorandum alleging unauthorized bond agreement and withholding of service credentials.",
    sim: 0.86
  },
  {
    cat: "Infrastructure Deficit",
    textA: "Fire NOC expired 6 months ago, emergency exits blocked, and chemistry lab lacks safety gear.",
    textB: "EVC physical inspection memo: campus building fire safety compliance failure and deficient labs.",
    sim: 0.87
  }
];

const hindiOverlapTemplates = [
  {
    cat: "Document Withholding",
    textA: "संस्थान प्रवेश रद्द करने के बाद छात्र के मूल 10वीं और 12वीं के प्रमाण पत्र वापस नहीं कर रहा है।",
    textB: "मूल शैक्षणिक दस्तावेज और टीसी अवैध रूप से रोकने के संबंध में एआईसीटीई नियमों के उल्लंघन की जांच।",
    sim: 0.87
  },
  {
    cat: "Fee Dispute",
    textA: "डिग्री पूरी होने के बाद कॉलेज प्रशासन ने 45000 रुपये की धरोहर राशि (कॉशन मनी) वापस नहीं की।",
    textB: "संस्थान द्वारा पास आउट छात्रों की कॉशन डिपॉजिट सुरक्षा राशि वापस न करने का मामला।",
    sim: 0.89
  },
  {
    cat: "Faculty Norms",
    textA: "इस्तीफा देने के बाद संकाय सदस्य की सर्विस बुक और पीएचडी डिग्री प्रमाण पत्र प्रबंधन द्वारा रोके गए।",
    textB: "संकाय सदस्यों के मूल दस्तावेज रोकने और अवैध बांड समझौते के संबंध में शिकायत।",
    sim: 0.85
  }
];

const tamilOverlapTemplates = [
  {
    cat: "Document Withholding",
    textA: "மாணவர் சேர்க்கை ரத்து செய்த பின் அசல் கல்வி சான்றிதழ்களை கல்லூரி நிர்வாகம் திருப்பி தர மறுக்கிறது.",
    textB: "அசல் சான்றிதழ்களை சட்டவிரோதமாக தடுத்து வைப்பது தொடர்பான ஒழுங்குமுறை குறைதீர்ப்பு அறிக்கை.",
    sim: 0.88
  },
  {
    cat: "Fee Dispute",
    textA: "படிப்பு முடிந்த பிறகும் 40000 ரூபாய் எச்சரிக்கை வைப்புத்தொகையை கல்லூரி திருப்பி அளிக்கவில்லை.",
    textB: "மாணவர்களுக்கு காஷன் டெபாசிட் தொகையை திருப்பி தராத விவகாரம் மற்றும் கட்டண சர்ச்சை.",
    sim: 0.89
  }
];

const pairs = [];
let idCounter = 1;

function pad(num) {
  return String(num).padStart(3, '0');
}

// 1. Generate 60 True English Overlaps (Same PID, Same/Related Category, High Semantic)
for (let i = 0; i < 60; i++) {
  const inst = institutions[i % institutions.length];
  const tmpl = englishOverlapTemplates[i % englishOverlapTemplates.length];
  const amount = (30000 + (i * 2500)).toString();
  const num = (15 + (i % 25)).toString();

  pairs.push({
    id: `PAIR-${pad(idCounter++)}`,
    case_a_id: `CMP-2026-PGRC-${pad(i + 1)}`,
    case_b_id: `CMP-2026-REG-${pad(i + 1)}`,
    case_a_pid: inst.pid,
    case_b_pid: inst.pid,
    case_a_category: tmpl.cat,
    case_b_category: tmpl.cat,
    case_a_text: tmpl.textA.replace('{amount}', amount).replace('{num}', num),
    case_b_text: tmpl.textB.replace('{amount}', amount).replace('{num}', num),
    semantic_similarity: tmpl.sim - ((i % 5) * 0.01),
    language: "English",
    is_overlap: true
  });
}

// 2. Generate 15 True Hindi Overlaps
for (let i = 0; i < 15; i++) {
  const inst = institutions[(i + 2) % institutions.length];
  const tmpl = hindiOverlapTemplates[i % hindiOverlapTemplates.length];
  pairs.push({
    id: `PAIR-${pad(idCounter++)}`,
    case_a_id: `CMP-2026-PGRC-H${pad(i + 1)}`,
    case_b_id: `CMP-2026-REG-H${pad(i + 1)}`,
    case_a_pid: inst.pid,
    case_b_pid: inst.pid,
    case_a_category: tmpl.cat,
    case_b_category: tmpl.cat,
    case_a_text: tmpl.textA,
    case_b_text: tmpl.textB,
    semantic_similarity: tmpl.sim - ((i % 4) * 0.01),
    language: "Hindi",
    is_overlap: true
  });
}

// 3. Generate 15 True Tamil Overlaps
for (let i = 0; i < 15; i++) {
  const inst = institutions[(i + 4) % institutions.length];
  const tmpl = tamilOverlapTemplates[i % tamilOverlapTemplates.length];
  pairs.push({
    id: `PAIR-${pad(idCounter++)}`,
    case_a_id: `CMP-2026-PGRC-T${pad(i + 1)}`,
    case_b_id: `CMP-2026-REG-T${pad(i + 1)}`,
    case_a_pid: inst.pid,
    case_b_pid: inst.pid,
    case_a_category: tmpl.cat,
    case_b_category: tmpl.cat,
    case_a_text: tmpl.textA,
    case_b_text: tmpl.textB,
    semantic_similarity: tmpl.sim - ((i % 3) * 0.01),
    language: "Tamil",
    is_overlap: true
  });
}

// 4. Generate 40 False Positives: Different PID (Different Colleges), Similar or Different Texts
for (let i = 0; i < 40; i++) {
  const instA = institutions[i % institutions.length];
  const instB = institutions[(i + 3) % institutions.length];
  const tmpl = englishOverlapTemplates[i % englishOverlapTemplates.length];

  pairs.push({
    id: `PAIR-${pad(idCounter++)}`,
    case_a_id: `CMP-2026-PGRC-FP${pad(i + 1)}`,
    case_b_id: `CMP-2026-REG-FP${pad(i + 1)}`,
    case_a_pid: instA.pid,
    case_b_pid: instB.pid,
    case_a_category: tmpl.cat,
    case_b_category: tmpl.cat,
    case_a_text: tmpl.textA.replace('{amount}', '40000').replace('{num}', '20'),
    case_b_text: tmpl.textB.replace('{amount}', '40000').replace('{num}', '20'),
    semantic_similarity: 0.88,
    language: "English",
    is_overlap: false // FALSE POSITIVE: Different institutions cannot be merged!
  });
}

// 5. Generate 30 False Positives: Same PID, but completely unrelated categories & incidents
for (let i = 0; i < 30; i++) {
  const inst = institutions[i % institutions.length];
  const catA = categories[i % categories.length];
  const catB = categories[(i + 2) % categories.length];

  pairs.push({
    id: `PAIR-${pad(idCounter++)}`,
    case_a_id: `CMP-2026-PGRC-DIST${pad(i + 1)}`,
    case_b_id: `CMP-2026-RO-DIST${pad(i + 1)}`,
    case_a_pid: inst.pid,
    case_b_pid: inst.pid,
    case_a_category: catA,
    case_b_category: catB,
    case_a_text: `Student grievance regarding ${catA.toLowerCase()} issue in department B semester 3.`,
    case_b_text: `Routine regulatory audit inspection for ${catB.toLowerCase()} compliance in academic block D.`,
    semantic_similarity: 0.22,
    language: "English",
    is_overlap: false // FALSE POSITIVE: Distinct independent issues
  });
}

console.log(`Total generated pairs: ${pairs.length}`);
const outputPath = path.join(__dirname, 'complaint_pairs_labeled.json');
fs.writeFileSync(outputPath, JSON.stringify(pairs, null, 2), 'utf-8');
console.log(`Successfully wrote ${pairs.length} pairs to ${outputPath}`);
