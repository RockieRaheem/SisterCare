# Sunbird AI & Sunflower Research Report

Date: January 2025
Source: https://salt.sunbird.ai/API/ | https://sunbird.ai/

---

## 1. Company Overview: Sunbird AI

**What is Sunbird AI?**

- African technology initiative focused on creating open, practical AI systems for community benefit
- Based in Kampala, Uganda
- Mission: Artificial intelligence with social impact
- Primary focus: Building AI solutions for African languages

**Location:**

- Plot 15, Naguru East Road, Kampala, Uganda
- PO Box 11296 Kampala, Uganda
- Email: info@sunbird.ai

**Key Product: Sunflower Multilingual Assistant**

- Multilingual language model assistant
- Supports **31 Ugandan languages**
- Features:
  - Accurate translations across local languages
  - Explanations and summaries in local languages
  - Conversational capabilities in Ugandan languages
  - Available at: https://sunflower.sunbird.ai/

---

## 2. SALT Platform & API Architecture

**SALT = Sunbird AI Language Technologies**

### Core API URL

```
https://api.sunbird.ai/
https://salt.sunbird.ai/API/
```

### Authentication

- All endpoints require `Authorization: Bearer <API_KEY>`
- API keys obtained from Sunbird dashboard
- Content-Type: `application/json` (or `multipart/form-data` for file uploads)

### Rate Limiting (by account tier)

- **Admin**: 1000 requests/minute
- **Premium**: 100 requests/minute
- **Standard**: 50 requests/minute
- **Free**: Limited requests per hour

On 429 (rate limit) responses, implement exponential backoff + jitter.

---

## 3. Supported Local Languages

### Language Codes for API Integration

**All supported language codes:**
| Code | Language | Region | API Support |
|------|----------|--------|-------------|
| `lug` | Luganda | Central Uganda | ✅ STT, Translation, TTS, Summarization |
| `nyn` | Runyankole | Southwest Uganda | ✅ STT, Translation, TTS |
| `teo` | Ateso | Eastern Uganda | ✅ STT, Translation, TTS |
| `ach` | Acholi | Northern Uganda | ✅ STT, Translation, TTS |
| `lgg` | Lugbara | West Nile Uganda | ✅ STT, Translation, TTS |
| `eng` | English | - | ✅ STT, Translation, TTS |
| `sw` | Swahili | Regional | ✅ TTS (partial) |

### Note on "Sunflower" (31 languages)

The Sunflower model supports 31 Ugandan languages, but the **SALT API currently focuses on 6-7 core languages** listed above for production use:

- Luganda (lug)
- Runyankole (nyn)
- Ateso (teo)
- Acholi (ach)
- Lugbara (lgg)
- English (eng)
- Swahili (sw) - partial support

---

## 4. API Endpoints Overview

### Core Task Endpoints

#### 1. **POST /tasks/stt** — Speech-to-Text

**Purpose:** Transcribe audio files to text

**Supported audio formats:** mp3, wav, ogg, m4a, aac

**Request parameters:**

```json
{
  "audio": "binary file",
  "language": "lug", // target language (default: lug)
  "adapter": "lug", // model adapter preference
  "recognise_speakers": false, // enable diarization
  "whisper": false // use whisper-assisted decoding
}
```

**Key constraints:**

- Max audio duration: 10 minutes (longer audio trimmed server-side)
- Large files (>100MB): use signed upload to Google Cloud Storage via `/tasks/stt_from_gcs`

**Response includes:**

- `audio_transcription`: Full transcribed text
- `formatted_diarization_output`: Speaker-labeled transcript (if enabled)
- `language`: Detected/used language code
- `was_audio_trimmed`: Boolean flag if audio exceeded limit

**Best practices:**

- Re-encode audio to 16kHz, mono, 16-bit PCM for best accuracy
- For long audio, chunk into segments and send multiple requests

---

#### 2. **POST /tasks/nllb_translate** — Neural Translation

**Purpose:** Translate text between English and local languages

**Request:**

```json
{
  "source_language": "eng",
  "target_language": "lug",
  "text": "How are you?"
}
```

**Supported language pairs:**

- English ↔ Luganda (lug)
- English ↔ Runyankole (nyn)
- English ↔ Ateso (teo)
- English ↔ Acholi (ach)
- English ↔ Lugbara (lgg)
- (and between local languages in future versions)

**Response:**

```json
{
  "id": "job-id",
  "status": "success",
  "executionTime": 123,
  "output": {
    "translated_text": "Oli otya?",
    "source_language": "eng",
    "target_language": "lug",
    "Error": null
  }
}
```

**Best practices:**

- Keep text short (<512 tokens) for consistent quality
- For bulk translations, use sequential requests or implement batching layer
- Supports Unicode characters

---

#### 3. **POST /tasks/language_id** — Language Identification

**Purpose:** Detect which language a text is written in

**Request:**

```json
{
  "text": "Nkwagala nnyo"
}
```

**Response:**

```json
{
  "language": "lug",
  "confidence": 0.95
}
```

**Supported output languages:** ach, teo, eng, lug, lgg, nyn

**Notes:**

- Returns "language not detected" for low-confidence inputs
- Aggregate predictions across sentences for mixed-language text
- Useful for auto-routing user input to correct language model

---

#### 4. **POST /tasks/summarise** — Text Summarization

**Purpose:** Generate anonymized short summaries of long text

**Request:**

```json
{
  "text": "Very long article or conversation text..."
}
```

**Response:**

```json
{
  "summarized_text": "Short summary...",
  "language": "lug",
  "processing_time": 2.5
}
```

**Currently supported languages:** English and Luganda

**For very long texts:**

- Chunk incrementally and combine summaries
- Apply basic anonymization heuristics (do NOT rely for legal PII removal)

---

#### 5. **POST /tasks/tts** — Text-to-Speech

**Purpose:** Convert text to speech in multiple languages with native speakers

**Supported voices & speaker IDs:**
| Language | Speaker ID | Gender | Notes |
|----------|-----------|--------|-------|
| Acholi | 241 | Female | Native speaker |
| Ateso | 242 | Female | Native speaker |
| Runyankole | 243 | Female | Native speaker |
| Lugbara | 245 | Female | Native speaker |
| Swahili | 246 | Male | Native speaker |
| Luganda | 248 | Female | Default voice |

**Request:**

```json
{
  "text": "Webale nyo",
  "speaker_id": 248, // Luganda (default)
  "temperature": 0.7, // 0.0-2.0 for expressiveness
  "max_new_audio_tokens": 2000 // 100-5000
}
```

**Parameters:**

- **text:** 1-5000 characters, supports Unicode
- **speaker_id:** Voice selection (see table above)
- **temperature:** Voice expressiveness control
  - 0.0-0.3: Monotone, consistent
  - 0.4-0.7: Balanced, natural **(recommended)**
  - 0.8-2.0: Expressive, variable intonation
- **max_new_audio_tokens:** Maximum audio length budget (100-5000)

**Response:**

```json
{
  "output": {
    "audio_url": "https://storage.googleapis.com/...",
    "duration_seconds": 4.2,
    "blob": "tts/20251003082338_uuid.mp3",
    "sample_rate": 16000,
    "format": "mp3",
    "speaker_id": 248,
    "processing_time": 1.8
  }
}
```

**Critical notes:**

- Signed URL expires in **2 minutes (120 seconds)** — download immediately
- To persist audio, store the `blob` path and regenerate signed URL server-side
- Sample rate: 16000 Hz (standard)
- Cache output by `blob` key to avoid re-generating same audio

**Best practices:**

- Download audio immediately after response
- For long-term storage, save `blob` and recreate signed URL server-side
- Re-use cached audio by `blob` to control costs
- For IVR/accessibility: Use speaker_id 248 (Luganda female) as default for Uganda

---

## 5. Error Handling & Retry Strategy

### Common HTTP Status Codes

| Status    | Meaning                                      | Action                                 |
| --------- | -------------------------------------------- | -------------------------------------- |
| 400       | Bad Request (missing fields, invalid params) | Check input validation                 |
| 401       | Unauthorized (invalid/missing API key)       | Verify API key                         |
| 408       | Request Timeout                              | Retry with backoff                     |
| 415       | Unsupported Media Type                       | Check MIME type & file extension       |
| 422       | Unprocessable (e.g., no transcription)       | Try re-encoding audio                  |
| 429       | Rate Limited                                 | Implement exponential backoff + jitter |
| 503 / 504 | Service Unavailable (worker timeout)         | Retry with exponential backoff         |

### Recommended Retry Pattern (Python)

```python
import time, random

def retry_api_call(fn, max_attempts=4):
    for attempt in range(max_attempts):
        try:
            return fn()
        except (ConnectionError, TimeoutError, ServerError) as e:
            if attempt == max_attempts - 1:
                raise
            delay = (2 ** attempt) + random.random()
            time.sleep(delay)
```

---

## 6. Integration Tips for SisterCare

### A. Chat API Integration (Voice-to-Text to Local Language)

```typescript
// 1. User speaks (audio recorded by browser)
const audioBlob = recordUserAudio(); // your recording logic

// 2. Send to Sunbird STT endpoint
const transcriptResponse = await fetch("https://api.sunbird.ai/tasks/stt", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${SUNBIRD_API_KEY}`,
  },
  body: autoFormData, // multipart with audio + language params
});

// 3. Get transcript in user's local language
const { audio_transcription, language } = await transcriptResponse.json();

// 4. Send to SisterCare chat with detected language
sendChatMessage(audio_transcription, language);
```

### B. Counsellor Communication in Local Languages

```typescript
// Detect user language automatically
const langDetectResponse = await fetch(
  "https://api.sunbird.ai/tasks/language_id",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNBIRD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: userInput,
    }),
  },
);

const { language } = await langDetectResponse.json();

// Translate counsellor response to user's language
const translateResponse = await fetch(
  "https://api.sunbird.ai/tasks/nllb_translate",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNBIRD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source_language: "eng",
      target_language: language, // e.g., 'lug' for Luganda
      text: counsellorResponse,
    }),
  },
);

const { translated_text } = await translateResponse.json();
```

### C. Audio Feedback for Menstrual Health Info

```typescript
// Generate menstrual health guidance in Luganda audio format
const ttsResponse = await fetch("https://api.sunbird.ai/tasks/tts", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${SUNBIRD_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    text: "Ensolo zo mu miezi gyonna biyitibwa period. Okulisa ensolo nti yetaagisa okukwatirira bangi...",
    speaker_id: 248, // Luganda female (native)
    temperature: 0.7,
    max_new_audio_tokens: 2000,
  }),
});

const { output } = await ttsResponse.json();
// Download audio_url immediately (expires in 2 min)
```

### D. Content Summarization in Local Language

```typescript
// Create short summaries of health articles in user's language
const summarizeResponse = await fetch(
  "https://api.sunbird.ai/tasks/summarise",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNBIRD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: longHealthArticle,
    }),
  },
);

const { summarized_text, language } = await summarizeResponse.json();
// Returns summary in detected language (Luganda or English)
```

---

## 7. Costs & Pricing Considerations

- **API Access:** Apply for API access at https://api.sunbird.ai/login
- **Rate tiers:** Free, Professional, Enterprise
- **Billing:** Likely per-request or monthly subscription (contact sales)
- **For SisterCare:** Use Sunflower model (31 languages) for public content library; SALT API for personalized user interactions

---

## 8. Related Resources

**Documentation:**

- Main SALT docs: https://salt.sunbird.ai/
- API Reference: https://salt.sunbird.ai/API/
- GitHub repo: https://github.com/SunbirdAI/salt

**Sunflower Model:**

- Interactive demo: https://sunflower.sunbird.ai/
- Academic paper: https://arxiv.org/abs/2510.07203v1
- Hugging Face models: https://huggingface.co/collections/Sunbird/sunflower-68dbacdc527c5fe8d60df1d9

**Support:**

- Email: info@sunbird.ai
- Twitter: @sunbirdai
- GitHub Issues: https://github.com/SunbirdAI/salt/issues

---

## 9. Key Takeaways for SisterCare

| Feature                         | Benefit for SisterCare                                  |
| ------------------------------- | ------------------------------------------------------- |
| **31 Ugandan language support** | Reach women across all regions of Uganda                |
| **STT (Speech-to-Text)**        | Voice-based menstrual health logging without text input |
| **TTS (Text-to-Speech)**        | Audio guidance for illiterate users; offline playback   |
| **Translation (NLLB)**          | Counsellor responses automatically localized            |
| **Language detection**          | Auto-route users to correct language model              |
| **Summarization**               | Short health tips in local language                     |
| **Native speaker voices**       | Authentic, trusted audio communication                  |

---

## 10. Next Steps

1. ✅ **Integrate STT** → Voice-based symptom input
2. ✅ **Add TTS** → Audio guidance playback
3. ✅ **Implement translation** → Counsellor chat in user's language
4. ✅ **Enable language detection** → Auto-detect user preference
5. ✅ **Summarize content** → Health tips in Luganda/Runyankole/etc.
6. ✅ **Cache TTS output** → Reduce API costs for repeated guidance

---

**Document prepared:** January 2025  
**Last updated:** From https://salt.sunbird.ai/API/ (Oct 2025 API version 1.3)  
**Maintained by:** Sunbird AI Team (info@sunbird.ai)
