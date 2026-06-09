"use client";

import { AssistantOrb } from "@/components/assistant-orb";
import {
  ArrowUp,
  CaretDown,
  ChatCircleText,
  Files,
  FolderSimple,
  Lightning,
  Plus,
  Robot,
  ShieldCheck,
  Sparkle,
  Stack,
  X,
  Trash,
  Users,
} from "@phosphor-icons/react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type WorkspaceMember = {
  id: string;
  role: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
};

export type WorkspaceProject = {
  id: string;
  name: string;
  description: string | null;
  role: string;
  members: WorkspaceMember[];
  prompt: {
    id: string;
    content: string;
    updatedAt: string;
  } | null;
  files: Array<{
    id: string;
    filename: string;
    mimeType: string;
    bytes: number;
    openaiFileId: string;
    createdAt: string;
  }>;
};

type ActiveUser = {
  id: string;
  email: string;
  name: string | null;
};

type ProjectWorkspaceClientProps = {
  initialProject: WorkspaceProject;
  initialUser: ActiveUser;
};

type UploadedProjectFile = {
  id: string;
  filename: string;
  mime_type?: string;
  mimeType?: string;
  bytes: number;
  openai_file_id?: string;
  openaiFileId?: string;
  created_at?: string;
  createdAt?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function initials(value: string) {
  return value
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("");
}

function normalizeProjectFile(file: UploadedProjectFile): WorkspaceProject["files"][number] {
  return {
    id: file.id,
    filename: file.filename,
    mimeType: file.mimeType || file.mime_type || "application/octet-stream",
    bytes: file.bytes,
    openaiFileId: file.openaiFileId || file.openai_file_id || "",
    createdAt: file.createdAt || file.created_at || new Date().toISOString(),
  };
}

export function ProjectWorkspaceClient({
  initialProject,
  initialUser,
}: ProjectWorkspaceClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [project, setProject] = useState(initialProject);
  const [activeUser] = useState(initialUser);
  const [members, setMembers] = useState(initialProject.members);
  const [promptContent, setPromptContent] = useState(
    initialProject.prompt?.content || "You are a helpful project assistant.",
  );
  const [files, setFiles] = useState(initialProject.files);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; role: string; content: string }>
  >([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const canEdit = project.role === "owner" || project.role === "editor";
  const canManageMembers = project.role === "owner";
  const activeUserName = activeUser.name || activeUser.email;

  type ConversationItem = { id: string; title: string | null; updated_at: string };
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Load conversations on mount, auto-load latest
  useEffect(() => {
    apiFetch<{ conversations: ConversationItem[] }>(`/projects/${project.id}/conversations`)
      .then((data) => {
        setConversations(data.conversations);
        if (data.conversations.length > 0) {
          loadConversationMessages(data.conversations[0].id);
        }
      })
      .catch(() => {});
  }, [project.id]);

  async function loadConversationMessages(cid: string) {
    setIsLoadingMessages(true);
    try {
      const data = await apiFetch<{
        conversation: { id: string; title: string | null };
        messages: Array<{ id: string; role: string; content: string }>;
      }>(`/projects/${project.id}/conversations/${cid}/messages`);
      setConversationId(data.conversation.id);
      setChatMessages(data.messages);
    } catch {
      setError("Failed to load conversation.");
    } finally {
      setIsLoadingMessages(false);
    }
  }

  function handleNewChat() {
    setConversationId(null);
    setChatMessages([]);
    setChatInput("");
    setSelectedFileIds([]);
    setIsFileMenuOpen(false);
  }

  async function handleDeleteConversation(cid: string) {
    if (!confirm("Hapus percakapan ini?")) return;
    try {
      await apiFetch(`/projects/${project.id}/conversations/${cid}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== cid));
      if (cid === conversationId) {
        handleNewChat();
      }
    } catch {
      setError("Gagal menghapus percakapan.");
    }
  }

  const selectedFiles = useMemo(
    () => files.filter((file) => selectedFileIds.includes(file.id)),
    [files, selectedFileIds],
  );

  async function handleProjectUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setNotice("");
    const formData = new FormData(event.currentTarget);
    try {
      const d = await apiFetch<{ project: { name?: string; description?: string | null } }>(`/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: String(formData.get("name") || ""), description: String(formData.get("description") || "") }),
      });
      setProject((c) => ({ ...c, ...d.project }));
      setNotice("Project saved.");
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr?.message || "Could not update project.");
    }
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setNotice("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const d = await apiFetch<{ member: WorkspaceMember }>(`/projects/${project.id}/members`, {
        method: "POST",
        body: JSON.stringify({ email: String(formData.get("email") || ""), role: String(formData.get("role") || "viewer") }),
      });
      setMembers((c) => [...c, d.member]);
      form.reset();
      setNotice("Collaborator added.");
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr?.message || "Could not add collaborator.");
    }
  }

  async function handleRoleChange(memberId: string, role: string) {
    setError(""); setNotice("");
    try {
      const d = await apiFetch<{ member: WorkspaceMember }>(`/projects/${project.id}/members/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      setMembers((c) => c.map((m) => (m.id === memberId ? d.member : m)));
      setNotice("Collaborator updated.");
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr?.message || "Could not update collaborator.");
    }
  }

  async function handleRemoveMember(memberId: string) {
    setError(""); setNotice("");
    try {
      await apiFetch(`/projects/${project.id}/members/${memberId}`, { method: "DELETE" });
      setMembers((c) => c.filter((m) => m.id !== memberId));
      setNotice("Collaborator removed.");
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr?.message || "Could not remove collaborator.");
    }
  }

  async function handleDeleteProject() {
    setError("");
    try {
      await apiFetch(`/projects/${project.id}`, { method: "DELETE" });
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr?.message || "Could not delete project.");
    }
  }

  async function handlePromptSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setNotice("");
    try {
      const d = await apiFetch<{ prompt: { content: string } }>(`/projects/${project.id}/prompts`, {
        method: "POST",
        body: JSON.stringify({ content: promptContent }),
      });
      setPromptContent(d.prompt.content);
      setNotice("Prompt saved.");
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr?.message || "Could not save prompt.");
    }
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setError(""); setNotice(""); setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const d = await apiFetch<{ file: UploadedProjectFile }>(`/projects/${project.id}/files`, { method: "POST", body: formData });
      const uploadedFile = normalizeProjectFile(d.file);
      setIsUploading(false);
      setFiles((c) => [uploadedFile, ...c.filter((item) => item.id !== uploadedFile.id)]);
      setSelectedFileIds((c) => c.includes(uploadedFile.id) ? c : [uploadedFile.id, ...c]);
      setIsFileMenuOpen(false);
      setNotice("File attached.");
    } catch (err: unknown) {
      setIsUploading(false);
      const apiErr = err as { message?: string };
      setError(apiErr?.message || "Could not upload file.");
    }
  }

  function toggleSelectedFile(fileId: string) {
    setSelectedFileIds((c) => c.includes(fileId) ? c.filter((id) => id !== fileId) : [...c, fileId]);
  }

  function removeSelectedFile(fileId: string) {
    setSelectedFileIds((c) => c.filter((id) => id !== fileId));
  }

  async function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message) return;
    setError("");
    setNotice("");
    setIsChatting(true);
    setChatInput("");

    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

    const tempUserId = crypto.randomUUID();
    setChatMessages((c) => [
      ...c,
      { id: tempUserId, role: "user", content: message },
    ]);

    const tempAssistantId = crypto.randomUUID();
    setChatMessages((c) => [
      ...c,
      { id: tempAssistantId, role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch(`${BASE_URL}/projects/${project.id}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message,
          file_ids: selectedFileIds,
          stream: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: "Chat failed" } }));
        throw err.error || { message: "Chat failed" };
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6);
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === "delta") {
              assistantContent += event.content;
              setChatMessages((c) =>
                c.map((m) =>
                  m.id === tempAssistantId
                    ? { ...m, content: assistantContent }
                    : m,
                ),
              );
            } else if (event.type === "guardrail_triggered") {
              assistantContent = event.content;
              setChatMessages((c) =>
                c.map((m) =>
                  m.id === tempAssistantId
                    ? { ...m, content: event.content }
                    : m,
                ),
              );
            } else if (event.type === "user_message") {
              if (event.message?.id) {
                setChatMessages((c) =>
                  c.map((m) =>
                    m.id === tempUserId
                      ? { ...m, id: event.message.id }
                      : m,
                  ),
                );
              }
            } else if (event.type === "done") {
              const newCid = event.conversation?.id || conversationId;
              setConversationId(newCid);

              // Add new conversation to list if it was freshly created
              if (!conversationId && newCid && event.conversation?.title) {
                setConversations((prev) => [
                  {
                    id: newCid,
                    title: event.conversation.title,
                    updated_at: new Date().toISOString(),
                  },
                  ...prev,
                ]);
              }

              setChatMessages((c) =>
                c.map((m) => {
                  if (m.id === tempUserId && event.user_message_id) {
                    return {
                      id: event.user_message_id,
                      role: m.role,
                      content: m.content,
                    };
                  }
                  if (m.id === tempAssistantId) {
                    return {
                      id: event.message?.id || m.id,
                      role: m.role,
                      content: event.message?.content || m.content,
                    };
                  }
                  return m;
                }),
              );
            } else if (event.type === "error") {
              setError(event.message || "Stream error");
            }
          } catch {
            // skip malformed JSON in stream
          }
        }
      }
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr?.message || "Could not send message.");
      setChatMessages((c) => c.filter((m) => m.id !== tempAssistantId));
      setChatInput(message);
    } finally {
      setIsChatting(false);
    }
  }

  const navItems = [
    { label: "Projects", icon: Stack, href: "/dashboard", active: false },
    { label: "Chat", icon: Sparkle, href: "#chat", active: true }, 
  ];

  return (
    <main className="relative min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#020205] text-[#f4f2fa]">
      <div className="shell-noise" />
      <div className="mx-auto grid min-h-[100dvh] max-w-[1500px] gap-6 px-4 py-6 lg:grid-cols-[292px_1fr]">
        {/* ── Sidebar (.panel) ── */}
        <aside className="panel flex flex-col rounded-[1.75rem] p-5 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)]">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <span className="grid h-10 w-10 place-items-center rounded-full border border-white/[0.07] bg-white/[0.05] text-accent transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:border-white/[0.14]">
              <Lightning size={18} weight="fill" />
            </span>
            <span className="font-display text-2xl font-semibold tracking-tight">YellowAI</span>
          </Link>

          <nav className="mt-14 space-y-2">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  style={{ transitionDelay: `${index * 50}ms` }}
                  className={cx(
                    "flex h-14 items-center gap-3 rounded-full px-5 text-sm transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                    item.active
                      ? "border border-white/[0.16] bg-white/[0.07] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                      : "text-white/42 hover:bg-white/[0.03] hover:text-white/72",
                  )}
                >
                  <Icon size={20} weight={item.active ? "fill" : "regular"} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* ── Conversations ── */}
          <div className="mt-8 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-xs font-medium uppercase tracking-wider text-white/30">History</p>
              {canEdit && (
              <button
                type="button"
                onClick={handleNewChat}
                className="glass-button grid h-7 w-7 place-items-center rounded-full text-white/48 hover:text-white/78"
                aria-label="New chat"
              >
                <Plus size={14} weight="regular" />
              </button>
              )}
            </div>
            <div className="space-y-1">
              {conversations.map((c) => (
                <div
                  key={c.id}
                  className={cx(
                    "group flex items-center gap-1 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    c.id === conversationId
                      ? "bg-white/[0.07] text-white"
                      : "text-white/42 hover:bg-white/[0.04] hover:text-white/68",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (c.id !== conversationId) loadConversationMessages(c.id);
                    }}
                    className="flex-1 truncate px-3 py-2 text-left text-sm"
                  >
                    {c.title || "Untitled"}
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(c.id);
                      }}
                      className="shrink-0 grid h-7 w-7 place-items-center rounded-full text-white/20 opacity-0 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                      aria-label="Delete conversation"
                    >
                      <Trash size={13} weight="regular" />
                    </button>
                  )}
                </div>
              ))}
              {conversations.length === 0 && (
                <p className="px-3 py-2 text-xs text-white/20">No conversations yet.</p>
              )}
            </div>
          </div>

          <div className="mt-auto">
            <div className="panel rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.05] text-accent">
                  <ShieldCheck size={17} weight="regular" />
                </span>
                <div>
                  <p className="text-sm font-medium text-white">Project role</p>
                  <p className="mt-0.5 text-xs uppercase tracking-wide text-white/36">{project.role}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main Content Area ── */}
        <section className="flex h-full flex-col">
          <header className="flex flex-wrap items-center justify-between gap-4 px-6 pt-6 sm:px-9">
              <Link
                href="/dashboard"
                className="glass-button inline-flex h-14 items-center gap-3 rounded-full px-5 text-sm text-white/76"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white/[0.05]">
                  <Lightning size={15} weight="fill" />
                </span>
                <span className="max-w-[11rem] truncate">{project.name}</span>
                <CaretDown size={16} className="text-white/42" />
              </Link>

              <div
                className="glass-button flex h-12 min-w-0 items-center gap-3 rounded-full px-4 text-sm text-white/64"
                title={activeUserName}
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-accent">
                  {initials(activeUserName) || "YA"}
                </span>
                <span className="hidden max-w-[10rem] truncate sm:inline">
                  {activeUserName}
                </span>
              </div>
            </header>

            <div className="relative z-10 grid flex-1 gap-6 px-4 pb-6 pt-6 sm:px-7 xl:grid-cols-[1fr_380px] overflow-y-auto">
              {/* ── Chat Section (Double-Bezel) ── */}
              <div className="bezel-shell max-h-[84vh] min-h-[84vh]">
                <div className="bezel-shell-inner relative flex max-h-[84vh] min-h-[84vh] flex-col overflow-hidden p-4 sm:p-6">
                  <div className="ambient-glow-top" />
                  <section id="chat" className="relative z-10 flex min-h-0 flex-1 flex-col">
                    <div className="flex min-h-0 flex-1 flex-col">
                      <div className="flex-1 overflow-y-auto pb-4">
                        {isLoadingMessages ? (
                          <div className="flex min-h-[calc(84vh-12rem)] items-center justify-center">
                            <div className="mx-auto grid max-w-3xl place-items-center text-center">
                              <AssistantOrb />
                              <p className="mt-6 text-sm text-white/40">Loading conversation...</p>
                            </div>
                          </div>
                        ) : chatMessages.length ? (
                          <div className="mx-auto w-full max-w-3xl space-y-3">
                            {chatMessages.map((msg) => (
                              <div
                                key={msg.id}
                                className={cx(
                                  "max-w-[85%] rounded-2xl border px-4 py-3.5 text-sm leading-6",
                                  msg.role === "assistant"
                                    ? "border-white/[0.05] bg-white/[0.03] text-white/82"
                                    : "ml-auto border-accent/16 bg-accent-soft text-white",
                                )}
                              >
                                <p className="mb-1.5 flex items-center gap-2 text-xs font-medium text-white/38">
                                  {msg.role === "assistant" ? <Robot size={13} weight="regular" /> : <ChatCircleText size={13} weight="regular" />}
                                  {msg.role}
                                </p>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex min-h-[calc(84vh-12rem)] items-center justify-center">
                            <div className="mx-auto grid max-w-3xl place-items-center text-center">
                              <div className="relative mb-8">
                                <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:16px_16px] opacity-30 [mask-image:radial-gradient(circle,black,transparent_66%)]" />
                                <AssistantOrb />
                              </div>
                              {canEdit ? (
                                <>
                                  <p className="font-display text-3xl font-semibold tracking-tight text-white/68">Let&apos;s get started.</p>
                                  <h1 className="font-display mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white/66 sm:text-5xl">
                                    How can I assist you today?
                                  </h1>
                                </>
                              ) : (
                                <>
                                  <p className="font-display text-2xl font-semibold tracking-tight text-white/48">View-only access</p>
                                  <p className="mt-3 max-w-md text-base text-white/32">
                                    Select a conversation from the sidebar to view chat history.
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── Chat Input (.panel) — sticky bottom ── */}
                      {canEdit && (
                      <div className="shrink-0 border-t border-white/[0.06] pt-4">
                        <div className="panel mx-auto w-full max-w-4xl rounded-2xl p-4">
                          <form onSubmit={handleChatSubmit}>
                            <div className="flex items-start gap-3">
                              <Sparkle size={21} weight="fill" className="mt-2 shrink-0 text-white/62" />
                              <textarea
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                rows={3}
                                className="min-h-28 flex-1 resize-none bg-transparent text-base leading-7 text-white outline-none placeholder:text-white/36"
                                placeholder="Ask me anything..."
                              />
                            </div>
                            {(selectedFiles.length > 0 || isFileMenuOpen) && (
                              <div className="mt-3 rounded-2xl border border-white/[0.05] bg-black/14 p-2">
                                {selectedFiles.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {selectedFiles.map((file) => (
                                      <button
                                        key={file.id}
                                        type="button"
                                        onClick={() => removeSelectedFile(file.id)}
                                        className="glass-button inline-flex max-w-[13rem] items-center gap-2 rounded-full px-3 py-1.5 text-xs text-white/62"
                                        title={file.filename}
                                      >
                                        <Files size={13} weight="regular" className="shrink-0 text-accent" />
                                        <span className="truncate">{file.filename}</span>
                                        <X size={12} weight="bold" className="shrink-0 text-white/34" />
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {isFileMenuOpen && (
                                  <div className={cx("space-y-1", selectedFiles.length > 0 && "mt-2 border-t border-white/[0.05] pt-2")}>
                                    {files.length ? (
                                      files.map((file) => {
                                        const selected = selectedFileIds.includes(file.id);
                                        return (
                                          <button
                                            key={file.id}
                                            type="button"
                                            onClick={() => toggleSelectedFile(file.id)}
                                            className={cx(
                                              "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                                              selected
                                                ? "bg-accent-soft text-white"
                                                : "text-white/46 hover:bg-white/[0.04] hover:text-white/72",
                                            )}
                                          >
                                            <Files size={15} weight={selected ? "fill" : "regular"} className="shrink-0 text-accent" />
                                            <span className="min-w-0 flex-1">
                                              <span className="block truncate text-xs font-medium">{file.filename}</span>
                                              <span className="text-[11px] text-white/30">{formatFileSize(file.bytes)}</span>
                                            </span>
                                          </button>
                                        );
                                      })
                                    ) : (
                                      <p className="px-3 py-2 text-xs text-white/30">No files uploaded.</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept=".pdf,.txt,.md,.csv,.json,.docx"
                                  className="hidden"
                                  onChange={handleFileUpload}
                                />
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  disabled={isUploading}
                                  className="glass-button grid h-9 w-9 place-items-center rounded-full text-white/62"
                                  aria-label="Upload file context"
                                >
                                  <Plus size={16} weight={isUploading ? "fill" : "regular"} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsFileMenuOpen((value) => !value)}
                                  className={cx(
                                    "glass-button inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs text-white/56",
                                    selectedFileIds.length > 0 && "border-accent/20 bg-accent-soft text-white/72",
                                  )}
                                  aria-label="Choose file context"
                                >
                                  <Files size={15} weight={selectedFileIds.length > 0 ? "fill" : "regular"} />
                                  <span>{selectedFileIds.length ? `${selectedFileIds.length} files` : "Files"}</span>
                                </button>
                              </div>
                              <button
                                type="submit"
                                disabled={isChatting || !chatInput.trim()}
                                className="accent-btn grid h-10 w-10 place-items-center rounded-full p-0 text-[#020205] disabled:opacity-30 disabled:shadow-none"
                                aria-label="Send message"
                              >
                                <ArrowUp size={17} weight="bold" />
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>

              {/* ── Tools Sidebar ── */}
              <aside className="flex max-h-[84vh] flex-col gap-4 overflow-y-auto">
                {(error || notice) && (
                  <div className={cx(
                    "panel shrink-0 rounded-2xl px-4 py-3 text-sm",
                    error ? "!border-red-400/16 !bg-red-500/5 text-red-100" : "!border-emerald-300/12 !bg-emerald-400/4 text-emerald-100"
                  )}>
                    {error || notice}
                  </div>
                )}

                {/* ── Unified Settings Section ── */}
                <div id="tools" className="bezel-shell min-h-0 flex-1 overflow-hidden">
                  <div className="bezel-shell-inner flex h-full flex-col gap-4 overflow-y-auto p-5">
                  {/* Prompt */}
                  <div className="panel rounded-2xl p-5">
                  <form onSubmit={handlePromptSave}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white tracking-tight">Agent prompt</p>
                        <p className="mt-1 text-xs text-white/36">Instructions used for each response</p>
                      </div>
                      {canEdit && (
                        <button className="glass-button rounded-full px-4 py-2 text-xs font-medium text-white/64" type="submit">Save</button>
                      )}
                    </div>
                    <textarea
                      value={promptContent}
                      onChange={(e) => setPromptContent(e.target.value)}
                      disabled={!canEdit}
                      rows={7}
                      className="field-surface mt-4 w-full resize-none rounded-2xl px-4 py-3 text-sm leading-6 disabled:opacity-45"
                    />
                  </form>
                </div>

                {/* Team */}
                <div className="panel rounded-2xl p-5" id="team">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white tracking-tight">Collaborators</p>
                      <p className="mt-1 text-xs text-white/36">Registered users only</p>
                    </div>
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.05] text-accent">
                      <Users size={18} weight="regular" />
                    </span>
                  </div>

                  {canManageMembers && (
                    <form onSubmit={handleAddMember} className="mt-4 space-y-3">
                      <input required type="email" name="email" className="field-surface w-full rounded-2xl px-4 py-2 text-sm" placeholder="teammate@example.com" />
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <select name="role" className="field-surface rounded-2xl px-3 py-2 text-sm" defaultValue="viewer">
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                        </select>
                        <button className="glass-button rounded-full px-4 py-2 text-sm font-medium text-white/64">Add</button>
                      </div>
                    </form>
                  )}

                  <div className="mt-4 space-y-2">
                    {members.map((member) => {
                      const isOwner = member.role === "owner";
                      return (
                        <div key={member.id} className="rounded-2xl border border-white/[0.04] bg-black/12 px-3 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white/80">{member.user.name || member.user.email}</p>
                              <p className="truncate text-xs text-white/32">{member.user.email}</p>
                            </div>
                            <span className="eyebrow border border-white/[0.05] bg-white/[0.03] text-white/40">{member.role}</span>
                          </div>
                          {canManageMembers && !isOwner && (
                            <div className="mt-3 flex items-center gap-2">
                              <select
                                value={member.role}
                                onChange={(e) => void handleRoleChange(member.id, e.target.value)}
                                className="field-surface min-w-0 flex-1 rounded-full px-3 py-1.5 text-xs"
                              >
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => void handleRemoveMember(member.id)}
                                className="glass-button rounded-full px-3 py-1.5 text-xs text-white/50 hover:text-red-100"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Settings */}
                <div className="panel rounded-2xl p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white tracking-tight">Project settings</p>
                      <p className="mt-1 text-xs text-white/36">Name and description</p>
                    </div>
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.05] text-accent">
                      <FolderSimple size={18} weight="regular" />
                    </span>
                  </div>

                  <form onSubmit={handleProjectUpdate} className="space-y-3">
                    <input name="name" disabled={!canEdit} defaultValue={project.name} className="field-surface w-full rounded-2xl px-4 py-2 text-sm disabled:opacity-45" />
                    <textarea name="description" rows={3} disabled={!canEdit} defaultValue={project.description || ""} className="field-surface w-full resize-none rounded-2xl px-4 py-2 text-sm disabled:opacity-45" />
                    {canEdit && (
                      <button className="glass-button w-full rounded-full px-4 py-2 text-sm font-medium text-white/64">Save project</button>
                    )}
                  </form>

                  {canManageMembers && (
                    <button
                      type="button"
                      onClick={handleDeleteProject}
                      className="mt-3 w-full rounded-full border border-red-400/16 bg-red-500/4 px-4 py-2 text-sm font-medium text-red-100 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-red-300/28 active:scale-[0.98]"
                    >
                      Delete project
                    </button>
                  )}
                </div>
                </div>
              </div>
              </aside>
            </div>
          </section>
        </div>
      </main>
  );
}
