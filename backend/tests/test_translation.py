from fastapi.testclient import TestClient

from app.services import translation as translation_service


def registration_payload() -> dict:
    return {
        "username": "translation_user",
        "phone": "13800000008",
        "sms_code": "123456",
        "registration_method": "password",
        "password": "password123",
        "nickname": "translation_user",
    }


def test_dictionary_response_returns_a_chinese_definition(monkeypatch):
    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return {
                "ec": {
                    "word": [
                        {
                            "trs": [
                                {"tr": [{"l": {"i": ["conj. 当……时"]}}]},
                                {"tr": [{"l": {"i": ["n. 一段时间"]}}]},
                            ]
                        }
                    ]
                }
            }

    monkeypatch.setattr(translation_service.httpx, "get", lambda *args, **kwargs: FakeResponse())

    assert translation_service.translate_english_to_chinese("While") == "当……时；一段时间"


def test_dictionary_definition_keeps_only_two_core_meanings():
    data = {
        "ec": {
            "word": [
                {
                    "trs": [
                        {
                            "tr": [
                                {
                                    "l": {
                                        "i": [
                                            "n. 路，公路，马路，街；途径，方法，路子；地下巷道"
                                        ]
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    }

    assert translation_service.extract_dictionary_definition(data, "Road") == "路；公路"


def test_translation_endpoint_requires_login_and_returns_translation(client: TestClient, sms_verification, monkeypatch):
    from app.api.v1.endpoints import translation

    session = client.post("/api/v1/auth/register", json=registration_payload()).json()
    monkeypatch.setattr(translation, "translate_english_to_chinese", lambda _text: "当……时")

    missing = client.post("/api/v1/translate", json={"text": "While"})
    assert missing.status_code == 401

    response = client.post(
        "/api/v1/translate",
        headers={"Authorization": f"Bearer {session['access_token']}"},
        json={"text": "While"},
    )
    assert response.status_code == 200
    assert response.json() == {"translation": "当……时"}
