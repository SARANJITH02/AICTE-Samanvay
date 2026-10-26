const fs = require('fs');
const path = require('path');

function simpleTokenJaccard(s1, s2) {
  const w1 = new Set((s1.toLowerCase().match(/\b\w+\b/g) || []));
  const w2 = new Set((s2.toLowerCase().match(/\b\w+\b/g) || []));
  if (w1.size === 0 || w2.size === 0) return 0;
  const intersection = new Set([...w1].filter(x => w2.has(x)));
  const union = new Set([...w1, ...w2]);
  return intersection.size / union.size;
}

function evaluateWeights(pairs, w1, w2, w3, w4, threshold = 0.65) {
  let tp = 0, fp = 0, tn = 0, fn = 0;

  for (const pair of pairs) {
    const pidMatch = pair.case_a_pid === pair.case_b_pid ? 1.0 : 0.0;
    const catMatch = pair.case_a_category.trim().toLowerCase() === pair.case_b_category.trim().toLowerCase() ? 1.0 : 0.0;
    const kwMatch = simpleTokenJaccard(pair.case_a_text, pair.case_b_text);
    const semMatch = Math.min(1.0, Math.max(0.0, pair.semantic_similarity || (kwMatch * 1.4)));

    let totalScore = (w1 * pidMatch) + (w2 * semMatch) + (w3 * catMatch) + (w4 * kwMatch);
    if (pidMatch === 0.0) {
      totalScore = Math.min(totalScore, 0.45);
    }

    const predictedOverlap = totalScore >= threshold;
    const actualOverlap = pair.is_overlap;

    if (predictedOverlap && actualOverlap) tp++;
    else if (predictedOverlap && !actualOverlap) fp++;
    else if (!predictedOverlap && !actualOverlap) tn++;
    else fn++;
  }

  const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
  const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
  const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const accuracy = (tp + tn) / pairs.length;

  return {
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    f1_score: Number(f1.toFixed(4)),
    accuracy: Number(accuracy.toFixed(4)),
    confusion_matrix: {
      true_positives: tp,
      false_positives: fp,
      true_negatives: tn,
      false_negatives: fn
    },
    total_pairs_evaluated: pairs.length,
    weights_used: {
      w1_institution_pid: w1,
      w2_semantic: w2,
      w3_category: w3,
      w4_keywords: w4,
      threshold
    }
  };
}

function run() {
  const evalDir = path.dirname(__filename);
  const datasetPath = path.join(evalDir, 'complaint_pairs_labeled.json');
  const outputPath = path.join(evalDir, 'eval_results.json');

  const pairs = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
  console.log(`Loaded ${pairs.length} labeled complaint pairs.`);

  const langCounts = { English: 0, Hindi: 0, Tamil: 0 };
  for (const p of pairs) {
    langCounts[p.language] = (langCounts[p.language] || 0) + 1;
  }

  // Evaluate baseline weights
  const results = evaluateWeights(pairs, 0.35, 0.35, 0.15, 0.15, 0.65);
  results.language_distribution = langCounts;
  results.dataset_description = "SYNTHETIC EVALUATION BENCHMARK (160 labeled multi-bureau technical grievance pairs)";
  results.calibration_timestamp = new Date().toISOString();

  console.log("\n========================================================");
  console.log("       AICTE SAMANVAY - MODEL EVALUATION METRICS        ");
  console.log("========================================================");
  console.log(`Dataset Size:       ${results.total_pairs_evaluated} pairs`);
  console.log(`Language Split:     English: ${langCounts.English}, Hindi: ${langCounts.Hindi}, Tamil: ${langCounts.Tamil}`);
  console.log(`Precision:          ${(results.precision * 100).toFixed(2)}%`);
  console.log(`Recall:             ${(results.recall * 100).toFixed(2)}%`);
  console.log(`F1 Score:           ${(results.f1_score * 100).toFixed(2)}%`);
  console.log(`Accuracy:           ${(results.accuracy * 100).toFixed(2)}%`);
  console.log(`Confusion Matrix:   TP=${results.confusion_matrix.true_positives}, FP=${results.confusion_matrix.false_positives}, TN=${results.confusion_matrix.true_negatives}, FN=${results.confusion_matrix.false_negatives}`);
  console.log("========================================================\n");

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`Saved results to ${outputPath}`);
}

run();
