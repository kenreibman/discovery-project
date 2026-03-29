# Domain Pitfalls

**Domain:** Legal discovery response automation (solo civil rights attorney)
**Researched:** 2026-03-29

## Critical Pitfalls

Mistakes that cause rewrites, legal liability, or project failure.

### Pitfall 1: AI Hallucination in Legal Content

**What goes wrong:** Claude generates plausible-sounding but fabricated legal language, incorrect objection bases, or references to nonexistent rules/standards. In the discovery response context, this could mean generating an objection citing a privilege that does not apply, or fabricating a substantive interrogatory answer that contradicts the complaint. Stanford's CodeX Center found LLMs fabricate citations in 30-45% of legal research responses. While this tool drafts responses rather than doing legal research, the hallucination risk extends to generating objection language that sounds correct but misapplies legal standards.

**Why it happens:** LLMs optimize for plausible output, not factual accuracy. Without grounding in Jessica's actual templates and the specific case facts, Claude will improvise legal language that may deviate from proper practice.

**Consequences:** If an AI-generated response slips through attorney review with a fabricated or misapplied objection, it could waive legitimate objections, create estoppel issues, or lead to bar sanctions. Federal judges have documented hundreds of instances of AI-fabricated content in filings through mid-2025.

**Prevention:**
- Ground every prompt with Jessica's exact template language. Provide her objection formulas verbatim and instruct Claude to select from them, not generate new ones.
- For RFP responses, constrain output to her three known patterns: "produced all documents," "no such documents exist," or objection with explanation. Do not allow freeform response generation.
- For interrogatories, separate the objection portion (templated) from the substantive answer portion (derived strictly from complaint facts provided in context).
- Use Claude's recommended anti-hallucination techniques: "Only use language from the provided templates. If no template matches, flag the request for manual drafting. Do not invent objection language."
- Include a confidence indicator in the review UI so Jessica can see which responses were high-confidence template matches vs. which required AI improvisation.

**Detection:** Compare AI output against known template patterns programmatically. Any response that does not match a known pattern should be visually flagged in the review UI.

**Phase:** Must be addressed in Phase 1 (core prompt engineering). This is the single highest-risk element of the entire project.

**Confidence:** HIGH -- well-documented across legal AI literature.

---

### Pitfall 2: PDF Parsing Failure on Scanned Discovery Requests

**What goes wrong:** Opposing counsel serves discovery requests as scanned PDFs (photographs of printed pages) rather than digitally-created PDFs. Standard text extraction (e.g., `pdf-parse`) returns empty or garbled text. The AI then receives garbage input and produces garbage output, or the upload silently fails with no error message, leaving Jessica confused.

**Why it happens:** Many law firms still print, sign, scan, and serve discovery documents. Scanned PDFs contain image data, not selectable text. Basic PDF libraries only extract embedded text layers. OCR quality issues include: blurry scans, skewed pages, handwritten annotations, stamps, and fax artifacts. Even advanced OCR engines miss up to 36% of key data on poor-quality scans.

**Consequences:** The tool becomes unusable for a significant percentage of real-world discovery requests. Jessica receives mangled or incomplete request parsing, and may not realize requests are missing or garbled -- leading to incomplete responses.

**Prevention:**
- Detect whether a PDF contains extractable text vs. scanned images on upload. If text extraction yields very little content relative to page count, trigger OCR pipeline.
- Use a robust OCR solution. Options ranked by reliability for legal documents: (1) cloud OCR APIs like Google Cloud Vision or AWS Textract, (2) Tesseract.js for client-side/serverless processing.
- Critical: after OCR, validate the extracted text looks like a discovery request (contains numbered requests, legal formatting). If validation fails, surface a clear error: "This document could not be parsed. Please upload a text-based PDF or contact support."
- Always show Jessica what the system extracted before generating responses, so she can catch parsing errors.

**Detection:** Log extraction quality metrics (characters per page, presence of expected patterns like numbered requests). Alert on anomalies.

**Phase:** Must be addressed in Phase 1. Without reliable PDF parsing, the entire tool is non-functional. However, consider starting with text-based PDFs only in the very first iteration and adding OCR as a fast-follow, since Jessica's own sample documents may be digital.

**Confidence:** HIGH -- scanned PDF issues are universally documented.

---

### Pitfall 3: Vercel Serverless Body Size Limit Blocks PDF Upload

**What goes wrong:** Vercel serverless functions have a hard 4.5 MB request body limit. Discovery request PDFs -- especially scanned ones with image data -- regularly exceed this. A 20-page scanned PDF can easily be 10-30 MB. The upload fails with a cryptic 413 error, and Jessica sees a broken experience.

**Why it happens:** Vercel's architecture routes all request bodies through their serverless function infrastructure, which enforces AWS Lambda's payload limits. This is not configurable.

**Consequences:** Jessica cannot upload real-world discovery PDFs. The tool appears broken for the most common use case.

**Prevention:**
- Use client-side direct upload to a blob store (Vercel Blob, S3, or Supabase Storage), bypassing the serverless function body entirely. The serverless function receives only a reference/URL to the uploaded file.
- Implement client-side file size validation with a clear message if files exceed reasonable limits (e.g., 50 MB).
- Process the PDF from blob storage asynchronously rather than in the upload request.

**Detection:** Test with real-world scanned PDFs during development, not just small sample files. The sample PDFs in `samples/` may be small enough to pass -- that is exactly why this pitfall is dangerous.

**Phase:** Must be addressed in Phase 1 (upload architecture). This is an architectural decision, not something that can be patched later without rework.

**Confidence:** HIGH -- verified directly from Vercel's official documentation.

---

### Pitfall 4: Vercel Function Timeout During PDF + AI Processing Chain

**What goes wrong:** The processing pipeline -- PDF upload, text extraction, OCR (if needed), Claude API call for 33 requests, response assembly -- exceeds Vercel's function timeout. Hobby plan: 300s max. Even Pro plan: 800s max. A single Claude API call for a complex prompt can take 30-60 seconds. Processing 33 individual requests sequentially could take 5-15 minutes.

**Why it happens:** The naive architecture sends a PDF, processes everything in one serverless function invocation, and returns the result. Legal documents are large, Claude API calls are slow for long outputs, and the processing chain is inherently sequential.

**Consequences:** Requests time out. Jessica sees an error after waiting several minutes. Partial work is lost.

**Prevention:**
- Design for asynchronous processing from Day 1. Upload triggers a job; the UI polls for completion or uses server-sent events/websockets.
- Break processing into stages: (1) PDF extraction, (2) request parsing, (3) individual response generation (can parallelize across requests), (4) document assembly.
- Use streaming for the Claude API response where possible -- Next.js supports streaming responses well.
- For RFPs with 33 requests, batch into parallel Claude calls (e.g., 5-8 requests per prompt) rather than one massive prompt or 33 individual calls.
- Consider whether the most compute-heavy step (OCR) should happen client-side or via a dedicated service outside Vercel.

**Detection:** Load test with realistic document sizes and request counts early. Time each pipeline stage independently.

**Phase:** Must be addressed in Phase 1 (processing architecture). Like the body size limit, this is architectural.

**Confidence:** HIGH -- verified from Vercel documentation. Timeout values are hard limits.

---

### Pitfall 5: Word Document Formatting Drift from Jessica's Templates

**What goes wrong:** The generated .docx file looks "close but wrong" -- slightly different fonts, wrong line spacing, different margin sizes, incorrect tab stops, missing formatting on the signature block. Jessica works entirely in Microsoft Word and will immediately notice if the output does not match her existing style. A tool that produces documents she has to reformat defeats the purpose.

**Why it happens:** JavaScript .docx libraries (docxtemplater, docx) generate Open XML from scratch or from templates. Subtle formatting details -- exact paragraph spacing (e.g., "before: 0pt, after: 0pt" vs. Word's defaults), font substitution, tab stop positions, indentation of numbered items -- are easy to get wrong. Word's own rendering of Open XML differs from the spec in many edge cases. What looks right in LibreOffice or Google Docs may look wrong in Word.

**Consequences:** Jessica rejects the tool output and reformats everything manually, negating the time savings. Or worse, she files a document with formatting errors that looks unprofessional.

**Prevention:**
- Use a template-based approach: take Jessica's actual .docx file as the template, and replace only the content portions. Docxtemplater is designed exactly for this -- load her real Word document with placeholder tags, fill in the AI-generated content.
- Test output exclusively in Microsoft Word on Windows (her actual environment), not in browser viewers or Google Docs.
- Capture her exact formatting specs from the sample files: font (name, size), line spacing (exact value), margins, paragraph spacing before/after, indentation, tab positions, header/footer content, signature block layout.
- Build a formatting regression test: generate a sample document, open in Word, compare visually against her benchmark files. Automate what you can (e.g., extract XML and diff paragraph properties).

**Detection:** Have Jessica review output formatting in the very first demo. Do not wait until the AI content is polished -- formatting fidelity should be validated first.

**Phase:** Should be validated in Phase 1. Use her actual sample .docx as the template base from the start.

**Confidence:** HIGH -- formatting fidelity is the most commonly cited complaint with document generation tools.

---

### Pitfall 6: Confidential Legal Documents Handled Insecurely

**What goes wrong:** Attorney-client privileged documents and case materials are uploaded to a web application without adequate security controls. Documents are stored in plaintext, accessible via predictable URLs, retained indefinitely, or processed through services that may use data for training. A breach or data leak could waive attorney-client privilege and violate ABA Rule 1.6 (duty of confidentiality).

**Why it happens:** Developers prioritize features over security in v1. Default configurations of storage services may be publicly accessible. The distinction between Claude API (no training on data, 7-day retention) and Claude consumer products (may train on data) is easy to confuse.

**Consequences:** Privilege waiver (courts have held that inadequate security can result in privilege waiver). Bar disciplinary action. Loss of client trust. Potential malpractice liability.

**Prevention:**
- Use Claude API (not consumer Claude) -- API inputs/outputs are not used for training and are deleted after 7 days. Confirm this in the API terms of service and document it for Jessica.
- Encrypt uploaded files at rest (e.g., Vercel Blob with encryption, or S3 with SSE).
- Implement authentication from Day 1 -- no public access to any document or API endpoint.
- Set explicit data retention: delete uploaded PDFs and generated documents after a reasonable period (e.g., 30 days) or on Jessica's request.
- Do not log full document contents in application logs or error tracking.
- Use HTTPS everywhere (Vercel provides this by default).
- Document the security posture so Jessica can inform clients that AI tools are used with appropriate safeguards.

**Detection:** Security audit checklist before launch: Can an unauthenticated user access any document? Are documents encrypted at rest? Is Claude API (not consumer) being used? Are documents retained only as long as needed?

**Phase:** Authentication and secure storage must be in Phase 1. Data retention policies and security documentation can follow in Phase 2.

**Confidence:** HIGH -- ABA Rule 1.6 obligations are clearly established; Anthropic's API data policies are documented.

---

## Moderate Pitfalls

### Pitfall 7: Prompt Brittleness Across Case Types

**What goes wrong:** Prompts engineered against the Swan v. Dollar Tree sample work well for employment discrimination cases but fail or produce poor output for other civil rights case types Jessica handles (excessive force, wrongful arrest, First Amendment retaliation, etc.). The system appears to work in testing but fails in production across her real case mix.

**Why it happens:** Over-fitting prompts to sample data. Civil rights litigation spans diverse fact patterns. Objection language may be consistent, but substantive interrogatory answers require different reasoning per case type.

**Prevention:**
- Design prompts with the case type as an explicit variable. Include case-type-specific instructions or examples where response patterns differ.
- Test with at least 3 different case types from Jessica's practice before considering prompt engineering "done."
- For interrogatories (the harder problem), use the complaint as the primary fact source and instruct Claude to derive answers only from provided facts, not from general legal knowledge.
- Build a prompt versioning system so prompts can be tuned per case type without breaking other types.

**Detection:** Ask Jessica to test with a non-employment case early. Track response quality ratings by case type.

**Phase:** Phase 2 (after RFP responses work for employment cases in Phase 1). Interrogatory responses are explicitly scoped as a second priority.

**Confidence:** MEDIUM -- inferred from the single-case-type sample data and Jessica's described practice areas.

---

### Pitfall 8: Request Parsing Fails on Non-Standard Discovery Formatting

**What goes wrong:** The AI misidentifies individual requests within a discovery document. It splits one request into two, merges two requests into one, misses requests entirely, or includes preamble text as a request. The resulting response has the wrong number of items and does not match the original document.

**Why it happens:** Discovery requests do not follow a single formatting standard. Some use "REQUEST NO. 1:", others use "1.", others use lettered sub-parts. Compound requests blur boundaries. Preamble definitions and instructions sections look similar to actual requests.

**Consequences:** Jessica gets a response with 31 items when there were 33 requests. She has to manually figure out what was missed or merged, which is more work than starting from scratch.

**Prevention:**
- Show Jessica the parsed request list before generating responses. Let her confirm "these are the 33 requests" before the AI drafts responses.
- Use the original request numbering as anchors. Instruct Claude to identify requests by their explicit numbering rather than inferring boundaries.
- Handle the definitions/instructions section separately -- extract it as context but do not generate responses for it.
- Build validation: the number of generated responses must match the number of parsed requests. Flag mismatches.

**Detection:** Compare parsed request count against what Jessica expects. Surface this in the UI prominently.

**Phase:** Phase 1 -- this is part of the core parsing pipeline.

**Confidence:** MEDIUM -- based on observed variability in legal document formatting.

---

### Pitfall 9: No Graceful Degradation When Claude API is Down or Slow

**What goes wrong:** The Claude API has an outage, rate limit, or degraded performance. The application shows a spinner indefinitely, returns a cryptic error, or loses Jessica's uploaded documents. She has no way to recover or retry.

**Why it happens:** Developers build the happy path first and add error handling later (or never). API dependencies are single points of failure.

**Consequences:** Jessica loses time and trust. If she uploaded documents and the process failed midway, she may need to re-upload and start over.

**Prevention:**
- Persist uploaded documents and parsed requests independently of the AI generation step. If generation fails, she should not need to re-upload.
- Implement retry with exponential backoff for Claude API calls.
- Show clear error messages: "AI generation failed. Your documents are saved. Click to retry."
- Consider a queue-based architecture where failed generation jobs can be retried without user intervention.
- Set up monitoring/alerting on API error rates.

**Detection:** Simulate API failures during development. Test the timeout, rate limit (429), and server error (500) paths.

**Phase:** Phase 1 for basic error handling and document persistence. Phase 2 for retry queues and monitoring.

**Confidence:** MEDIUM -- standard API dependency risk, not specific to legal domain but high impact given the single-API-provider architecture.

---

### Pitfall 10: Ignoring the "Review" Part of "Draft and Review"

**What goes wrong:** The development focuses entirely on AI generation quality and neglects the review UI. Jessica gets a wall of text with no easy way to compare each request against its response, approve individual items, edit specific responses, or flag items for manual drafting. The "review and edit" step -- which is where the attorney fulfills their ethical obligation -- becomes so painful that the tool saves no time.

**Why it happens:** The AI generation is the technically interesting problem. The review UI is "just a form." But Jessica's workflow is: review each request-response pair, approve or edit, then export. If this step is clunky, the tool fails regardless of AI quality.

**Consequences:** Jessica finds it faster to draft from scratch in Word than to wrestle with a bad review interface. The tool is abandoned.

**Prevention:**
- Design the review UI as the primary interface, not an afterthought. Side-by-side view: original request on the left, AI response on the right.
- Per-item actions: approve, edit (inline), flag for manual rewrite, regenerate (re-run AI for just this item).
- Preserve context: show the full discovery document and complaint alongside responses so Jessica does not need to switch between windows.
- Keyboard shortcuts for power users (approve and next, flag and next).
- Track review state: which items are approved, which are pending, which are flagged.

**Detection:** Paper-prototype the review flow with Jessica before building it. Her feedback on workflow will be more valuable than any technical research.

**Phase:** Phase 1 -- the review UI is as core as the AI generation. Ship them together.

**Confidence:** HIGH -- the project description explicitly identifies the review UI as a key requirement, and the competitive analysis notes Briefpoint's per-request interaction as a differentiator.

---

## Minor Pitfalls

### Pitfall 11: Over-Engineering Multi-Tenancy Prematurely

**What goes wrong:** Developer builds authentication, role-based access, organization management, and tenant isolation for "future multi-attorney support" before validating the core product with Jessica. Months of development go into infrastructure that may never be needed.

**Why it happens:** It feels responsible to "plan for scale." The project description mentions potential expansion to other attorneys.

**Prevention:** Build for Jessica only. Simple email/password auth. Single-user data model. The project document correctly scopes multi-tenancy as out of scope for v1. Resist the urge to add "just a little" multi-tenancy scaffolding.

**Detection:** If you are building a users table with organization_id in Phase 1, stop.

**Phase:** Explicitly out of scope until after validation.

**Confidence:** HIGH -- the project document already guards against this, but it bears repeating.

---

### Pitfall 12: Underestimating Interrogatory Complexity vs. RFPs

**What goes wrong:** After RFP responses work well (highly formulaic), the team assumes interrogatory responses will be similarly straightforward. They are not. Interrogatories require substantive, case-specific answers derived from complaint facts, not just template selection. The AI must reason about which facts from the complaint are relevant to each interrogatory, which is a much harder problem.

**Why it happens:** The project correctly prioritizes RFPs first. But the success of RFP generation creates false confidence about interrogatory generation difficulty.

**Prevention:**
- Treat interrogatory response generation as a separate, harder problem with its own prompt engineering effort.
- Accept that interrogatory responses will need more human editing than RFP responses. Set Jessica's expectations accordingly.
- Consider a two-tier approach: generate the objection portion (templated, high confidence) and the substantive answer portion (AI-drafted, lower confidence, clearly marked for review).

**Detection:** If RFP response quality is rated 8/10 by Jessica and interrogatory quality is 4/10, this pitfall has materialized.

**Phase:** Phase 2 -- the project plan already sequences this correctly.

**Confidence:** MEDIUM -- based on analysis of the sample documents showing interrogatories are structurally more complex than RFPs.

---

### Pitfall 13: Not Handling the General Statements Boilerplate Correctly

**What goes wrong:** The AI generates general statements boilerplate as part of each response set, but it slightly varies the language each time. Or it omits it entirely. Or it includes it but with different formatting than Jessica's template. The general statements are legally significant -- they preserve objections broadly -- and must be exact.

**Why it happens:** LLMs rephrase by default. Even when instructed to use exact language, they may subtly alter wording.

**Prevention:** Do not generate boilerplate with AI at all. Hard-code Jessica's exact general statements text into the document template. Insert it programmatically, not via Claude. Same for the signature block.

**Detection:** Diff the generated boilerplate against Jessica's template text. Any difference is a bug.

**Phase:** Phase 1 -- this is a template architecture decision.

**Confidence:** HIGH -- straightforward to prevent if identified early; easy to miss if boilerplate is lumped into AI generation.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| PDF Upload & Parsing | Scanned PDFs fail silently (Pitfall 2); body size limit blocks upload (Pitfall 3) | Client-side upload to blob storage; OCR detection pipeline; show extracted text for confirmation |
| AI Response Generation | Hallucinated legal language (Pitfall 1); prompt brittleness (Pitfall 7) | Constrain to templates; flag non-template responses; test across case types |
| Processing Architecture | Timeout on long documents (Pitfall 4) | Async processing from Day 1; parallelize Claude calls; stream responses |
| Word Document Export | Formatting does not match (Pitfall 5); boilerplate varies (Pitfall 13) | Template-based generation from her actual .docx; hard-code boilerplate |
| Review UI | Unusable review experience (Pitfall 10) | Side-by-side design; per-item actions; paper-prototype with Jessica first |
| Security & Ethics | Privilege/confidentiality breach (Pitfall 6) | Auth from Day 1; Claude API (not consumer); encrypt at rest; document security posture |
| Interrogatory Support | Underestimating complexity (Pitfall 12) | Treat as separate harder problem; two-tier objection + substantive answer approach |
| Reliability | API outage loses work (Pitfall 9) | Persist uploads independently; retry logic; clear error messaging |

## Sources

- [Vercel Functions Limitations](https://vercel.com/docs/functions/limitations) -- official documentation on timeout, body size, and memory limits
- [Reduce Hallucinations - Claude API Docs](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)
- [AI Hallucinations in Legal Work: How to Avoid Getting Sanctioned (2026)](https://thelegalprompts.com/blog/ai-hallucinations-legal-work-avoid-sanctions-2026)
- [ABA Practical Checklist for Using AI Responsibly](https://www.americanbar.org/groups/law_practice/resources/law-technology-today/2026/checklist-for-using-ai-responsibly-in-your-law-firm/)
- [Anthropic Data Retention Policy - Organization Data](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data) -- API data deleted after 7 days, not used for training
- [How to Bypass Vercel 4.5MB Body Size Limit](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions)
- [Docxtemplater](https://docxtemplater.com/) -- template-based .docx generation from existing Word documents
- [OCR vs. AI PDF Readers: What Developers Need to Know in 2026](https://ourcodeworld.com/articles/read/2912/ocr-vs-ai-pdf-readers-what-developers-need-to-know-in-2026)
- [2026 Law Firm Data Security Guide](https://www.clio.com/blog/data-security-law-firms/)
- [Briefpoint: How to Automate Legal Discovery](https://briefpoint.ai/automate-legal-discovery/) -- competitor approach and lessons
