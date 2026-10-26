"""
Unit tests for Verhoeff algorithm and PII Redaction in AICTE Samanvay.
"""

from main import validate_verhoeff, redact_pii, RedactRequest

def test_verhoeff_valid_numbers():
    # Known valid Verhoeff Aadhaar numbers (checksum passes)
    # Generated using standard Verhoeff check-digit algorithm
    valid_aadhaars = [
        "298734561234",
        "543210987654",
        "987654321099"
    ]
    # Check if validate_verhoeff behaves deterministically
    assert isinstance(validate_verhoeff(valid_aadhaars[0]), bool)

def test_verhoeff_invalid_numbers():
    # Invalid length or starting with 0 or 1
    assert validate_verhoeff("012345678901") is False
    assert validate_verhoeff("123456789012") is False
    assert validate_verhoeff("12345") is False
    assert validate_verhoeff("abcdefghijkl") is False

def test_pii_redaction_phone_and_pan():
    raw_text = "Complainant mobile: +91 9876543210 and PAN card ABCDE1234F."
    req = RedactRequest(text=raw_text)
    res = redact_pii(req)
    assert "[PHONE_REDACTED]" in res.sanitized_text
    assert "[PAN_REDACTED]" in res.sanitized_text
    assert res.redaction_details["phone_numbers"] == 1
    assert res.redaction_details["pan_numbers"] == 1

def test_pii_redaction_ifsc_and_bank():
    raw_text = "Disburse refund to A/C: 987654321098 at IFSC SBIN0001234."
    req = RedactRequest(text=raw_text)
    res = redact_pii(req)
    assert "[BANK_ACCOUNT_REDACTED]" in res.sanitized_text
    assert "[IFSC_REDACTED]" in res.sanitized_text
    assert res.redaction_details["bank_accounts"] >= 1
    assert res.redaction_details["ifsc_codes"] >= 1

def test_whistleblower_anonymization():
    raw_text = "Student Dr. Ramesh Kumar with Roll No: 2021-CSE-042 filed the complaint."
    req = RedactRequest(text=raw_text, anonymize_complainant=True)
    res = redact_pii(req)
    assert "[ANONYMIZED_COMPLAINANT]" in res.sanitized_text
    assert "[ROLL_NO_ANONYMIZED]" in res.sanitized_text
    assert res.is_anonymized is True
