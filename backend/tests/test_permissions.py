from app.core.roles import role_has_permission


def test_owner_has_all_permissions():
    assert role_has_permission("owner", "read")
    assert role_has_permission("owner", "edit")
    assert role_has_permission("owner", "upload_files")
    assert role_has_permission("owner", "manage_members")


def test_editor_permissions():
    assert role_has_permission("editor", "read")
    assert role_has_permission("editor", "edit")
    assert role_has_permission("editor", "upload_files")
    assert not role_has_permission("editor", "manage_members")


def test_viewer_read_only():
    assert role_has_permission("viewer", "read")
    assert not role_has_permission("viewer", "edit")
    assert not role_has_permission("viewer", "upload_files")
    assert not role_has_permission("viewer", "manage_members")


def test_unknown_role_denied():
    assert not role_has_permission("guest", "read")
    assert not role_has_permission("guest", "edit")
