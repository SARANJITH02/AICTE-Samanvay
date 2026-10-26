"""
Unit tests for the Statistical Control Chart Anomaly Detection Engine (Z >= 3.0 threshold).
"""

from main import analyze_root_causes

def test_known_anomalous_series():
    # Corpus with an extreme recurring non-compliance phrase spike
    anomalous_corpus = [
        "Certificate retention penalty demanded upon resignation under illegal bond agreement.",
        "Management mandates certificate retention penalty of 5 lakhs for relieving letter.",
        "Illegal certificate retention penalty imposed on junior faculty member.",
        "Protest against certificate retention penalty in computer engineering department.",
        "Court notice served regarding certificate retention penalty.",
        "Routine bus facility fee inquiry.",
        "Hostel room allocation dispute.",
        "Internal exam mark discrepancy."
    ]

    req = {
        "region": "Southern",
        "complaint_texts": anomalous_corpus,
        "z_threshold": 2.5 # Configurable threshold test
    }
    res = analyze_root_causes(req)
    assert res.systemic_anomaly_detected is True
    assert "Certificate Retention" in res.top_clusters[0].phrase or "Retention Penalty" in res.top_clusters[0].phrase
    assert res.top_clusters[0].is_systemic_anomaly is True


def test_normal_baseline_series():
    # Corpus where all issues are uniform and independent (no phrase spikes)
    normal_corpus = [
        "Student inquiring about semester grade card issuance.",
        "Faculty requesting attendance regularization for conference travel.",
        "Hostel mess food quality feedback submitted by council.",
        "Gymnasium equipment repair request in sports complex.",
        "Placement brochure printing vendor payment follow-up."
    ]

    req = {
        "region": "Northern",
        "complaint_texts": normal_corpus,
        "z_threshold": 3.0
    }
    res = analyze_root_causes(req)
    # Under standard 3.0 sigma, a uniform low-count distribution should not trigger an anomaly alert
    assert res.systemic_anomaly_detected is False
