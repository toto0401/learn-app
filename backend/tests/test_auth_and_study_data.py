from fastapi.testclient import TestClient


def registration_payload(username: str, phone: str) -> dict:
    return {
        "username": username,
        "phone": phone,
        "sms_code": "123456",
        "registration_method": "password",
        "password": "password123",
        "nickname": username,
    }


def register(client: TestClient, username: str, phone: str) -> dict:
    response = client.post("/api/v1/auth/register", json=registration_payload(username, phone))
    assert response.status_code == 201, response.text
    return response.json()


def auth_header(token_response: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {token_response['access_token']}"}


def study_payload(description: str) -> dict:
    return {
        "tasks": [
            {
                "id": "task-1",
                "subject": "数学",
                "description": description,
                "duration": 30,
                "done": True,
                "elapsed": 1800,
                "weekKey": "2026-W29",
                "dayIndex": 4,
            }
        ],
        "review_cards": [
            {
                "id": "card-1",
                "front": "sync",
                "back": "同步",
                "subject": "英语",
                "createdAt": 1784360000000,
                "nextReview": 1784446400000,
                "interval": 1,
                "ease": 2.5,
                "reviewCount": 1,
                "memoryStatus": "已记住",
            }
        ],
        "checkin_days": ["2026-07-17", "2026-07-18"],
        "review_seconds": 75,
    }


def test_register_returns_session_and_authenticated_profile(client, sms_verification):
    session = register(client, "register_user", "13800000001")

    response = client.get("/api/v1/auth/me", headers=auth_header(session))

    assert response.status_code == 200
    assert response.json()["username"] == "register_user"
    assert response.json()["phone"] == "13800000001"


def test_nickname_update_persists_for_later_logins(client, sms_verification):
    session = register(client, "nickname_user", "13800000009")
    headers = auth_header(session)

    updated = client.put("/api/v1/auth/me/nickname", headers=headers, json={"nickname": "新的昵称"})
    assert updated.status_code == 200
    assert updated.json()["nickname"] == "新的昵称"

    logged_in_again = client.post(
        "/api/v1/auth/login", json={"username": "nickname_user", "password": "password123"}
    )
    assert logged_in_again.status_code == 200
    assert logged_in_again.json()["user"]["nickname"] == "新的昵称"


def test_register_rejects_duplicate_phone(client, sms_verification):
    register(client, "first_user", "13800000002")

    response = client.post(
        "/api/v1/auth/register",
        json=registration_payload("second_user", "13800000002"),
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "该手机号已经注册过了"


def test_register_rejects_expired_or_invalid_sms_code(client, sms_verification):
    sms_verification(False)

    response = client.post(
        "/api/v1/auth/register",
        json=registration_payload("bad_code_user", "13800000003"),
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "验证码不正确或已过期"


def test_reset_password_requires_valid_sms_code_and_changes_login_password(client, sms_verification):
    register(client, "reset_user", "13800000004")
    sms_verification(False)

    rejected = client.post(
        "/api/v1/auth/forgot-password",
        json={"phone": "13800000004", "sms_code": "123456", "new_password": "newpassword123"},
    )
    assert rejected.status_code == 400

    sms_verification(True)
    reset = client.post(
        "/api/v1/auth/forgot-password",
        json={"phone": "13800000004", "sms_code": "123456", "new_password": "newpassword123"},
    )
    assert reset.status_code == 200

    old_login = client.post(
        "/api/v1/auth/login", json={"username": "reset_user", "password": "password123"}
    )
    new_login = client.post(
        "/api/v1/auth/login", json={"username": "reset_user", "password": "newpassword123"}
    )
    assert old_login.status_code == 401
    assert new_login.status_code == 200


def test_protected_routes_require_a_valid_login(client, sms_verification):
    missing = client.get("/api/v1/auth/me")
    malformed = client.get("/api/v1/study-data", headers={"Authorization": "Bearer invalid"})

    assert missing.status_code == 401
    assert malformed.status_code == 401


def test_study_data_is_saved_and_isolated_per_user(client, sms_verification):
    first_session = register(client, "study_user_one", "13800000005")
    second_session = register(client, "study_user_two", "13800000006")
    first_headers = auth_header(first_session)
    second_headers = auth_header(second_session)

    empty = client.get("/api/v1/study-data", headers=first_headers)
    assert empty.status_code == 200
    assert empty.json()["initialized"] is False

    saved = client.put("/api/v1/study-data", headers=first_headers, json=study_payload("first user's task"))
    assert saved.status_code == 200
    assert saved.json()["initialized"] is True

    second_empty = client.get("/api/v1/study-data", headers=second_headers)
    assert second_empty.status_code == 200
    assert second_empty.json()["initialized"] is False

    loaded = client.get("/api/v1/study-data", headers=first_headers)
    assert loaded.status_code == 200
    assert loaded.json()["tasks"][0]["description"] == "first user's task"
    assert loaded.json()["review_seconds"] == 75
    assert loaded.json()["review_cards"][0]["memoryStatus"] == "已记住"
