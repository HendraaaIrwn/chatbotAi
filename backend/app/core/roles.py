from typing import Literal

ProjectRole = Literal["owner", "editor", "viewer"]
ProjectPermission = Literal["read", "edit", "manage_members", "upload_files"]

_project_roles = {"owner", "editor", "viewer"}


def is_project_role(role: str) -> bool:
    return role in _project_roles


def can_edit_project(role: str) -> bool:
    return role in ("owner", "editor")


def can_read_project(role: str) -> bool:
    return is_project_role(role)


def can_manage_members(role: str) -> bool:
    return role == "owner"


def can_upload_files(role: str) -> bool:
    return role in ("owner", "editor")


def role_has_permission(role: str, permission: str) -> bool:
    if permission == "read":
        return can_read_project(role)
    if permission == "edit":
        return can_edit_project(role)
    if permission == "manage_members":
        return can_manage_members(role)
    if permission == "upload_files":
        return can_upload_files(role)
    return False
