"""
Comprehensive unit tests for the Two-Layer Contradiction Detection Engine.
Tests at least 10 positive conflicting cases and 10 negative non-conflicting cases.
"""

from main import detect_contradictions, ContradictionRequest

def test_10_conflict_cases():
    conflict_cases = [
        # 1. Refund vs Status Quo Hold
        ("PGRC mandates immediate refund of Rs 40,000 caution deposit.",
         "Regulation Bureau issues stay order to maintain status quo on all disbursements."),
        
        # 2. Return deposit vs Withhold
        ("Regional Office orders return deposit to student within 7 days.",
         "Bureau of Regulation instructs institution to withhold caution money pending bank guarantee."),
        
        # 3. Restitution vs Frozen funds
        ("Immediate restitution of capitation fee ordered.",
         "All accounts and disbursements frozen pending scrutiny committee audit."),
        
        # 4. Intake Freeze vs Provisional Approval
        ("AICTE Regulation Bureau orders zero intake for next academic year.",
         "Regional Office grants provisional approval and extension of approval for 120 seats."),
        
        # 5. Revoke Approval vs Allow Admissions
        ("Executive Committee orders revoke approval due to building deficiency.",
         "Regional Committee permits allow admissions under provisional quota."),
        
        # 6. Freeze Admissions vs Extension of Approval
        ("Freeze admissions across all diploma courses immediately.",
         "EOA granted: allow admissions in computer science and mechanical streams."),
        
        # 7. Faculty Reinstate vs Faculty Dismissal
        ("PGRC directs institute to reinstate faculty member and return service book.",
         "Regulation Bureau mandates disqualify faculty and terminate faculty appointment."),
        
        # 8. Withdraw Termination vs Terminate Faculty
        ("Direct management to withdraw termination order of Assistant Professor.",
         "Inquiry committee directs institute to terminate faculty for fake credentials."),
        
        # 9. Campus Inspection vs Inspection Deferred
        ("Regional Director mandates depute surprise EVC for physical inspection.",
         "Appellate Bureau issues order to stay inspection and defer EVC visit."),
        
        # 10. Surprise Physical Verification vs Waive Physical Visit
        ("Conduct surprise physical verification of lab infrastructure.",
         "Bureau orders waive physical visit based on uploaded compliance video.")
    ]

    for directive_a, directive_b in conflict_cases:
        req = ContradictionRequest(
            bureau_a_name="Bureau A",
            bureau_a_directive=directive_a,
            bureau_b_name="Bureau B",
            bureau_b_directive=directive_b
        )
        res = detect_contradictions(req)
        assert res.has_contradiction is True, f"Failed on conflict case: '{directive_a}' vs '{directive_b}'"
        assert res.dissonance_score > 0.80
        assert res.contradiction_reason is not None


def test_10_non_conflict_cases():
    non_conflict_cases = [
        # 1. Harmonious Refund Orders
        ("PGRC orders return deposit to complainant within 15 days.",
         "Regulation Bureau orders refund caution deposit in compliance with APH."),
        
        # 2. Distinct Subjects (Library vs Mess)
        ("PGRC directs updating library book stock in mechanical section.",
         "Regional Office requests hostel mess hygiene report."),
        
        # 3. Both Agreeing on Inspection
        ("PGRC requests EVC committee deputation.",
         "Regional Office to conduct inspection of computer lab facilities."),
        
        # 4. Routine Compliance
        ("Upload mandatory disclosure on institutional website.",
         "Submit faculty biometric attendance logs before month end."),
        
        # 5. Negated Directives (Negation prevents false conflict!)
        ("Do not withhold original documents of student.",
         "Ensure smooth issuance of transfer certificate."),
        
        # 6. Negated Refund ("No refund ordered")
        ("No refund ordered as student withdrew after academic cutoff deadline.",
         "Maintain status quo on institutional seat allocation."),
        
        # 7. Fire Safety Audit
        ("Install emergency exit signs in academic block B.",
         "Submit valid Fire NOC from municipal authorities."),
        
        # 8. Fee Concession
        ("Direct institute to provide SC/ST fee waiver documentation.",
         "Forward scholarship application to state social welfare department."),
        
        # 9. Faculty Biometrics
        ("Ensure AICTE biometric attendance portal is linked.",
         "Verify faculty qualification certificates during recruitment."),
        
        # 10. Anti-Ragging Committee
        ("Convene anti-ragging squad meeting for incoming first year batch.",
         "Display anti-ragging toll free helpline on notice boards.")
    ]

    for directive_a, directive_b in non_conflict_cases:
        req = ContradictionRequest(
            bureau_a_name="Bureau A",
            bureau_a_directive=directive_a,
            bureau_b_name="Bureau B",
            bureau_b_directive=directive_b
        )
        res = detect_contradictions(req)
        assert res.has_contradiction is False, f"False positive detected on: '{directive_a}' vs '{directive_b}'"
        assert res.dissonance_score < 0.20
