from fastapi.testclient import TestClient


def test_register(client: TestClient):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "new@test.com",
            "password": "password123",
            "name": "Test User",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["user"]["email"] == "new@test.com"
    assert "token" in data


def test_register_duplicate(client: TestClient):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "dup@test.com",
            "password": "password123",
        },
    )
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "dup@test.com",
            "password": "password123",
        },
    )
    assert response.status_code == 409


def test_login(client: TestClient):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "login@test.com",
            "password": "password123",
        },
    )
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "login@test.com",
            "password": "password123",
        },
    )
    assert response.status_code == 200
    assert "token" in response.json()


def test_login_invalid(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "nobody@test.com",
            "password": "wrong",
        },
    )
    assert response.status_code == 401


def test_me_optional(client: TestClient):
    response = client.get("/api/v1/me")
    assert response.status_code == 200
    assert response.json()["user"] is None


def test_me_authenticated(client: TestClient, auth_headers):
    response = client.get("/api/v1/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["user"]["email"] == "test@example.com"
