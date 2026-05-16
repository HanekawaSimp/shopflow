import requests
from functools import wraps
from flask import request, jsonify, g
from config import config


def require_auth(f):
    """Middleware to verify JWT token via auth service."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "UNAUTHORIZED", "message": "No token provided"}), 401

        try:
            response = requests.get(
                f"{config.AUTH_SERVICE_URL}/api/auth/verify",
                headers={"Authorization": auth_header},
                timeout=5,
            )

            if response.status_code != 200:
                return jsonify({"error": "UNAUTHORIZED", "message": "Invalid token"}), 401

            data = response.json()
            g.current_user = data.get("user", {})
            return f(*args, **kwargs)

        except requests.exceptions.ConnectionError:
            print("[AUTH] Cannot reach auth service")
            return jsonify({"error": "SERVICE_UNAVAILABLE", "message": "Auth service unreachable"}), 503
        except requests.exceptions.Timeout:
            print("[AUTH] Auth service timeout")
            return jsonify({"error": "SERVICE_UNAVAILABLE", "message": "Auth service timeout"}), 503
        except Exception as e:
            print(f"[AUTH] Verification error: {e}")
            return jsonify({"error": "INTERNAL_ERROR", "message": "Authentication failed"}), 500

    return decorated


def require_role(*roles):
    """Middleware to check if user has one of the required roles."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = getattr(g, 'current_user', None)
            if not user or user.get('role') not in roles:
                return jsonify({"error": "FORBIDDEN", "message": "Insufficient permissions"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
