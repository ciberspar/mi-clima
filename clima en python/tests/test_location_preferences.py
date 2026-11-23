import json

import pytest

from clima_g.storage.settings import SettingsStore


def test_external_wifi_is_disabled_by_default(tmp_path):
    store = SettingsStore(tmp_path)

    preferences = store.get_location_preferences()

    assert preferences == {
        "external_wifi_enabled": False,
        "external_wifi_provider": None,
        "external_wifi_consent": False,
    }


def test_external_wifi_requires_explicit_consent(tmp_path):
    store = SettingsStore(tmp_path)

    with pytest.raises(PermissionError):
        store.set_external_wifi_location(
            True,
            provider="example",
            consent=False,
        )

    assert store.get_location_preferences()["external_wifi_enabled"] is False


def test_external_wifi_can_be_enabled_with_consent(tmp_path):
    store = SettingsStore(tmp_path)

    store.set_external_wifi_location(
        True,
        provider="example",
        consent=True,
    )

    preferences = store.get_location_preferences()

    assert preferences["external_wifi_enabled"] is True
    assert preferences["external_wifi_provider"] == "example"
    assert preferences["external_wifi_consent"] is True


def test_external_wifi_can_be_disabled_without_revoking_consent(tmp_path):
    store = SettingsStore(tmp_path)

    store.set_external_wifi_location(
        True,
        provider="example",
        consent=True,
    )
    store.set_external_wifi_location(False)

    preferences = store.get_location_preferences()

    assert preferences["external_wifi_enabled"] is False
    assert preferences["external_wifi_consent"] is True


def test_external_wifi_consent_can_be_revoked(tmp_path):
    store = SettingsStore(tmp_path)

    store.set_external_wifi_location(
        True,
        provider="example",
        consent=True,
    )
    store.revoke_external_wifi_consent()

    assert store.get_location_preferences() == {
        "external_wifi_enabled": False,
        "external_wifi_provider": None,
        "external_wifi_consent": False,
    }


def test_invalid_saved_preferences_are_disabled(tmp_path):
    store = SettingsStore(tmp_path)
    store.directory.mkdir(parents=True, exist_ok=True)

    store.file.write_text(
        json.dumps({
            "location_preferences": {
                "external_wifi_enabled": True,
                "external_wifi_provider": "example",
                "external_wifi_consent": False,
            }
        }),
        encoding="utf-8",
    )

    assert store.get_location_preferences()["external_wifi_enabled"] is False


def test_old_settings_remain_compatible(tmp_path):
    store = SettingsStore(tmp_path)
    store.directory.mkdir(parents=True, exist_ok=True)

    store.file.write_text(
        json.dumps({
            "version": 1,
            "favorites": [],
        }),
        encoding="utf-8",
    )

    assert store.get_location_preferences()["external_wifi_enabled"] is False
