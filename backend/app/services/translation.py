import re
from typing import Any

import httpx


YOUDAO_DICTIONARY_URL = "https://dict.youdao.com/jsonapi"
HTML_TAG_PATTERN = re.compile(r"<[^>]+>")
CHINESE_PATTERN = re.compile(r"[\u4e00-\u9fff]")
PART_OF_SPEECH_PATTERN = re.compile(r"^(?:[a-z]+\.\s*|【[^】]+】\s*)+", re.IGNORECASE)
DEFINITION_SEPARATOR_PATTERN = re.compile(r"[，、；;,]")


class TranslationProviderError(Exception):
    """Raised when the dictionary cannot provide a usable Chinese definition."""


def clean_definition(value: Any) -> str:
    text = HTML_TAG_PATTERN.sub("", str(value or ""))
    return re.sub(r"\s+", " ", text).strip()


def extract_core_meanings(value: Any, limit: int = 2) -> list[str]:
    """Keep the first one or two useful meanings for a compact flash card."""

    definition = PART_OF_SPEECH_PATTERN.sub("", clean_definition(value))
    meanings: list[str] = []
    for part in DEFINITION_SEPARATOR_PATTERN.split(definition):
        meaning = PART_OF_SPEECH_PATTERN.sub("", part).strip(" 。．.")
        if meaning and CHINESE_PATTERN.search(meaning):
            meanings.append(meaning)
        if len(meanings) >= limit:
            break
    return meanings


def extract_dictionary_definition(data: dict[str, Any], text: str) -> str:
    words = ((data.get("ec") or {}).get("word") or [])
    if words:
        definitions: list[str] = []
        for item in (words[0].get("trs") or []):
            parts = ((item.get("tr") or [{}])[0].get("l") or {}).get("i") or []
            definitions.extend(extract_core_meanings(" ".join(str(part) for part in parts)))
            if len(definitions) >= 2:
                break
        if definitions:
            return "；".join(definitions[:2])

    # Phrases often do not have a regular dictionary entry. Prefer an exact
    # match from the web dictionary rather than unrelated search suggestions.
    target = text.strip().lower()
    for entry in ((data.get("web_trans") or {}).get("web-translation") or []):
        if str(entry.get("key") or "").strip().lower() != target:
            continue
        values: list[str] = []
        for item in entry.get("trans") or []:
            values.extend(extract_core_meanings(item.get("value")))
            if len(values) >= 2:
                break
        if values:
            return "；".join(values[:3])
    return ""


def translate_english_to_chinese(text: str) -> str:
    try:
        response = httpx.get(
            YOUDAO_DICTIONARY_URL,
            params={"q": text},
            headers={"User-Agent": "LearnApp/1.0"},
            timeout=8.0,
        )
        response.raise_for_status()
        translation = extract_dictionary_definition(response.json(), text)
    except (httpx.HTTPError, ValueError, TypeError) as exc:
        raise TranslationProviderError from exc

    # Do not show an English fallback or a corrupt response as a Chinese meaning.
    if not translation or not CHINESE_PATTERN.search(translation):
        raise TranslationProviderError
    return translation
