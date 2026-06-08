"use client";

import { AssistantOrb } from "@/components/assistant-orb";
import {
  ArrowUp,
  BookmarkSimple,
  CaretDown,
  ChatCircleText,
  CopySimple,
  Files,
  FolderSimple,
  GearSix,
  Globe,
  Lightning,
  Microphone,
  Plus,
  Robot,
  ShieldCheck,
  SidebarSimple,
  Sparkle,
  Stack,
  Users,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

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

type ProjectWorkspaceClientProps = {
  initialProject: WorkspaceProject;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

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

export function ProjectWorkspaceClient({
  initialProject,
}: ProjectWorkspaceClientProps) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
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
  const canEdit = project.role === "owner" || project.role === "editor";
  const canManageMembers = project.role === "owner";

  const selectedFiles = useMemo(
    () => files.filter((file) => selectedFileIds.includes(file.id)),
    [files, selectedFileIds],
  );

  async function handleProjectUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") || ""),
        description: String(formData.get("description") || ""),
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error?.message || "Could not update project.");
      return;
    }

    setProject((current) => ({ ...current, ...data.project }));
    setNotice("Project saved.");
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch(`/api/projects/${project.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(formData.get("email") || ""),
        role: String(formData.get("role") || "viewer"),
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error?.message || "Could not add collaborator.");
      return;
    }

    setMembers((current) => [...current, data.member]);
    form.reset();
    setNotice("Collaborator added.");
  }

  async function handleRoleChange(memberId: string, role: string) {
    setError("");
    setNotice("");

    const response = await fetch(
      `/api/projects/${project.id}/members/${memberId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      },
    );
    const data = await response.json();

    if (!response.ok) {
      setError(data.error?.message || "Could not update collaborator.");
      return;
    }

    setMembers((current) =>
      current.map((member) => (member.id === memberId ? data.member : member)),
    );
    setNotice("Collaborator updated.");
  }

  async function handleRemoveMember(memberId: string) {
    setError("");
    setNotice("");

    const response = await fetch(
      `/api/projects/${project.id}/members/${memberId}`,
      { method: "DELETE" },
    );
    const data = await response.json();

    if (!response.ok) {
      setError(data.error?.message || "Could not remove collaborator.");
      return;
    }

    setMembers((current) => current.filter((member) => member.id !== memberId));
    setNotice("Collaborator removed.");
  }

  async function handleDeleteProject() {
    setError("");
    const response = await fetch(`/api/projects/${project.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error?.message || "Could not delete project.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handlePromptSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const response = await fetch(`/api/projects/${project.id}/prompts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: promptContent }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error?.message || "Could not save prompt.");
      return;
    }

    setPromptContent(data.prompt.content);
    setNotice("Prompt saved.");
  }

  async function handleFileUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsUploading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch(`/api/projects/${project.id}/files`, {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    setIsUploading(false);

    if (!response.ok) {
      setError(data.error?.message || "Could not upload file.");
      return;
    }

    setFiles((current) => [data.file, ...current]);
    form.reset();
    setNotice("File uploaded.");
  }

  function toggleSelectedFile(fileId: string) {
    setSelectedFileIds((current) =>
      current.includes(fileId)
        ? current.filter((id) => id !== fileId)
        : [...current, fileId],
    );
  }

  async function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = chatInput.trim();

    if (!message) {
      return;
    }

    setError("");
    setNotice("");
    setIsChatting(true);
    setChatInput("");

    const response = await fetch(`/api/projects/${project.id}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId,
        message,
        fileIds: selectedFileIds,
      }),
    });
    const data = await response.json();
    setIsChatting(false);

    if (!response.ok) {
      setError(data.error?.message || "Could not send message.");
      setChatInput(message);
      return;
    }

    setConversationId(data.conversation.id);
    setChatMessages((current) => [...current, ...data.messages]);
  }

  const navItems = [
    { label: "Projects", icon: Stack, href: "/dashboard", active: false },
    { label: "Intelligence", icon: Sparkle, href: "#chat", active: true },
    { label: "Agent", icon: Robot, href: "#prompt", active: false },
    { label: "Files", icon: Files, href: "#files", active: false },
    { label: "Team", icon: Users, href: "#team", active: false },
  ];

  return (
    <main className="relative min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#05060d] text-[#f4f2fa]">
      <div className="shell-noise" />
      <div className="grid min-h-[100dvh] lg:grid-cols-[292px_1fr]">
        <aside className="soft-panel relative z-10 flex min-h-full flex-col border-y-0 border-l-0 px-5 py-7 lg:sticky lg:top-0 lg:h-[100dvh]">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                <Lightning size={18} weight="fill" />
              </span>
              <span className="text-2xl font-semibold">YellowAI</span>
            </Link>
            <button
              type="button"
              className="glass-button grid h-10 w-10 place-items-center rounded-full text-white/70 active:scale-95"
              aria-label="Toggle sidebar"
            >
              <SidebarSimple size={18} />
            </button>
          </div>

          <nav className="mt-14 space-y-3">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cx(
                    "flex h-14 items-center gap-3 rounded-full px-5 text-sm transition active:scale-[0.99]",
                    item.active
                      ? "border border-white/22 bg-white/12 text-white shadow-[inset_18px_0_32px_rgba(255,255,255,0.12),inset_-24px_0_36px_rgba(255,255,255,0.12),0_14px_38px_rgba(0,0,0,0.26)]"
                      : "text-white/48 hover:bg-white/[0.04] hover:text-white/80",
                  )}
                >
                  <Icon size={20} weight={item.active ? "fill" : "regular"} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-[20px] border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/8 text-[#cbbcff]">
                <ShieldCheck size={18} />
              </span>
              <div>
                <p className="text-sm font-medium text-white">Project role</p>
                <p className="mt-1 text-xs uppercase text-white/42">
                  {project.role}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="relative px-4 py-5 sm:px-6 lg:px-7">
          <div className="soft-panel relative min-h-[calc(100dvh-2.5rem)] overflow-hidden rounded-[34px]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.12),transparent_34rem)]" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-80 bg-[radial-gradient(circle_at_100%_70%,rgba(203,188,255,0.18),transparent_24rem)]" />

            <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 px-6 pt-6 sm:px-9">
              <Link
                href="/dashboard"
                className="glass-button inline-flex h-14 items-center gap-3 rounded-full px-5 text-sm text-white/82 active:scale-[0.99]"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white/8">
                  <Lightning size={15} weight="fill" />
                </span>
                <span className="max-w-[11rem] truncate">{project.name}</span>
                <CaretDown size={16} className="text-white/52" />
              </Link>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="glass-button hidden h-12 w-12 place-items-center rounded-full text-white/78 sm:grid"
                  aria-label="Language"
                >
                  <Globe size={21} />
                </button>
                <div className="glass-button flex h-12 items-center gap-3 rounded-full px-4 text-sm text-white/72">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#cbbcff]/18 text-[#cbbcff]">
                    {initials(project.name) || "YA"}
                  </span>
                  <span className="hidden max-w-[8rem] truncate sm:inline">
                    {project.id.slice(0, 6)}...{project.id.slice(-4)}
                  </span>
                </div>
              </div>
            </header>

            <div className="relative z-10 grid gap-6 px-4 pb-8 pt-8 sm:px-7 xl:grid-cols-[1fr_390px]">
              <section
                id="chat"
                className="relative min-h-[720px] rounded-[30px] border border-white/8 bg-[#05060d]/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-6"
              >
                <div className="absolute right-5 top-20 hidden flex-col gap-4 lg:flex">
                  {[
                    { label: "Save", icon: BookmarkSimple },
                    { label: "Copy", icon: CopySimple },
                    { label: "Settings", icon: GearSix },
                  ].map((action) => {
                    const Icon = action.icon;

                    return (
                      <button
                        key={action.label}
                        type="button"
                        className="glass-button grid h-14 w-14 place-items-center rounded-full text-white/72"
                        aria-label={action.label}
                      >
                        <Icon size={21} />
                      </button>
                    );
                  })}
                </div>

                <div className="mx-auto flex min-h-[620px] max-w-5xl flex-col justify-end">
                  <div className="flex flex-1 flex-col justify-center pb-8">
                    {chatMessages.length ? (
                      <div className="mx-auto w-full max-w-3xl space-y-3">
                        {chatMessages.map((message) => (
                          <div
                            key={message.id}
                            className={cx(
                              "max-w-[86%] rounded-[22px] border px-4 py-3 text-sm leading-6 shadow-[0_18px_48px_rgba(0,0,0,0.24)]",
                              message.role === "assistant"
                                ? "border-white/9 bg-white/[0.055] text-white/86"
                                : "ml-auto border-[#cbbcff]/26 bg-[#cbbcff]/18 text-white",
                            )}
                          >
                            <p className="mb-1 flex items-center gap-2 text-xs font-medium text-white/44">
                              {message.role === "assistant" ? (
                                <Robot size={14} />
                              ) : (
                                <ChatCircleText size={14} />
                              )}
                              {message.role}
                            </p>
                            <p className="whitespace-pre-wrap">
                              {message.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mx-auto grid max-w-3xl place-items-center text-center">
                        <div className="relative mb-8">
                          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:14px_14px] opacity-50 [mask-image:radial-gradient(circle,black,transparent_66%)]" />
                          <AssistantOrb />
                        </div>
                        <p className="text-3xl font-semibold text-white/78">
                          Let&apos;s get started.
                        </p>
                        <h1 className="mt-4 max-w-3xl text-4xl font-semibold text-white/76 sm:text-5xl">
                          How can I assist you today?
                        </h1>
                      </div>
                    )}
                  </div>

                  <form
                    onSubmit={handleChatSubmit}
                    className="mx-auto w-full max-w-4xl rounded-[28px] border border-white/18 bg-[#070812]/90 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_32px_90px_rgba(0,0,0,0.46),42px_18px_80px_rgba(203,188,255,0.12)]"
                  >
                    <div className="flex items-start gap-3">
                      <Sparkle
                        size={22}
                        weight="fill"
                        className="mt-2 shrink-0 text-white/72"
                      />
                      <textarea
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                        rows={3}
                        className="min-h-28 flex-1 resize-none bg-transparent text-base leading-7 text-white outline-none placeholder:text-white/45"
                        placeholder="Ask me anything..."
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="glass-button grid h-9 w-9 place-items-center rounded-full text-white/72"
                          aria-label="Add context"
                        >
                          <Plus size={17} />
                        </button>
                        {selectedFiles.length ? (
                          selectedFiles.slice(0, 3).map((file) => (
                            <button
                              key={file.id}
                              type="button"
                              onClick={() => toggleSelectedFile(file.id)}
                              className="glass-button max-w-[13rem] truncate rounded-full px-3 py-2 text-xs text-white/58"
                              title={file.filename}
                            >
                              {file.filename}
                            </button>
                          ))
                        ) : (
                          <>
                            <span className="rounded-full bg-white/[0.045] px-3 py-2 text-xs text-white/42">
                              DeFi Execution
                            </span>
                            <span className="rounded-full bg-white/[0.045] px-3 py-2 text-xs text-white/42">
                              Research Brief
                            </span>
                            <span className="rounded-full bg-white/[0.045] px-3 py-2 text-xs text-white/42">
                              Goal Tasks
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="glass-button grid h-9 w-9 place-items-center rounded-full text-white/62"
                          aria-label="Voice input"
                        >
                          <Microphone size={17} />
                        </button>
                        <button
                          disabled={isChatting}
                          className="grid h-10 w-10 place-items-center rounded-full bg-[#b8a2ff] text-[#070812] shadow-[0_0_32px_rgba(184,162,255,0.35)] transition hover:bg-[#cbbcff] active:scale-95 disabled:opacity-60"
                          aria-label="Send message"
                        >
                          <ArrowUp size={18} weight="bold" />
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </section>

              <aside className="grid auto-rows-min gap-4 xl:grid-flow-row">
                {(error || notice) && (
                  <div
                    className={cx(
                      "rounded-[22px] border px-4 py-3 text-sm",
                      error
                        ? "border-red-400/20 bg-red-500/10 text-red-100"
                        : "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
                    )}
                  >
                    {error || notice}
                  </div>
                )}

                <form
                  id="prompt"
                  onSubmit={handlePromptSave}
                  className="soft-panel rounded-[26px] p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        Agent prompt
                      </p>
                      <p className="mt-1 text-xs text-white/42">
                        Instructions used for each response
                      </p>
                    </div>
                    {canEdit ? (
                      <button
                        className="glass-button rounded-full px-4 py-2 text-xs font-medium text-white/76"
                        type="submit"
                      >
                        Save
                      </button>
                    ) : null}
                  </div>
                  <textarea
                    value={promptContent}
                    onChange={(event) => setPromptContent(event.target.value)}
                    disabled={!canEdit}
                    rows={7}
                    className="field-surface mt-4 w-full resize-none rounded-[18px] px-4 py-3 text-sm leading-6 disabled:opacity-60"
                  />
                </form>

                <section id="files" className="soft-panel rounded-[26px] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">Files</p>
                      <p className="mt-1 text-xs text-white/42">
                        {selectedFileIds.length} selected for chat
                      </p>
                    </div>
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-white/7 text-[#cbbcff]">
                      <Files size={19} />
                    </span>
                  </div>

                  {canEdit ? (
                    <form onSubmit={handleFileUpload} className="mt-4 space-y-3">
                      <input
                        required
                        name="file"
                        type="file"
                        accept=".pdf,.txt,.md,.csv,.json,.docx"
                        className="field-surface block w-full rounded-[16px] px-3 py-2 text-sm text-white/62 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-sm file:text-white"
                      />
                      <button
                        disabled={isUploading}
                        className="glass-button w-full rounded-full px-4 py-2.5 text-sm font-medium text-white/76 disabled:opacity-60"
                      >
                        {isUploading ? "Uploading..." : "Upload file"}
                      </button>
                    </form>
                  ) : null}

                  <div className="mt-4 space-y-2">
                    {files.length ? (
                      files.map((file) => (
                        <label
                          key={file.id}
                          className={cx(
                            "flex cursor-pointer items-start gap-3 rounded-[18px] border px-3 py-3 transition active:scale-[0.99]",
                            selectedFileIds.includes(file.id)
                              ? "border-[#cbbcff]/42 bg-[#cbbcff]/12"
                              : "border-white/8 bg-black/18 hover:border-white/16",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selectedFileIds.includes(file.id)}
                            onChange={() => toggleSelectedFile(file.id)}
                            className="mt-1 accent-[#cbbcff]"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-white/84">
                              {file.filename}
                            </span>
                            <span className="text-xs text-white/38">
                              {formatFileSize(file.bytes)}
                            </span>
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="rounded-[18px] border border-dashed border-white/12 px-3 py-8 text-center text-sm text-white/38">
                        No files uploaded.
                      </p>
                    )}
                  </div>
                </section>

                <section id="team" className="soft-panel rounded-[26px] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        Collaborators
                      </p>
                      <p className="mt-1 text-xs text-white/42">
                        Registered users only
                      </p>
                    </div>
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-white/7 text-[#cbbcff]">
                      <Users size={19} />
                    </span>
                  </div>

                  {canManageMembers ? (
                    <form onSubmit={handleAddMember} className="mt-4 space-y-3">
                      <input
                        required
                        type="email"
                        name="email"
                        className="field-surface w-full rounded-[16px] px-3 py-2 text-sm"
                        placeholder="teammate@example.com"
                      />
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <select
                          name="role"
                          className="field-surface rounded-[16px] px-3 py-2 text-sm"
                          defaultValue="viewer"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                        </select>
                        <button className="glass-button rounded-full px-4 py-2 text-sm font-medium text-white/76">
                          Add
                        </button>
                      </div>
                    </form>
                  ) : null}

                  <div className="mt-4 space-y-2">
                    {members.map((member) => {
                      const isOwner = member.role === "owner";

                      return (
                        <div
                          key={member.id}
                          className="rounded-[18px] border border-white/8 bg-black/18 px-3 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white/86">
                                {member.user.name || member.user.email}
                              </p>
                              <p className="truncate text-xs text-white/38">
                                {member.user.email}
                              </p>
                            </div>
                            <span className="rounded-full bg-white/7 px-2.5 py-1 text-xs uppercase text-white/48">
                              {member.role}
                            </span>
                          </div>

                          {canManageMembers && !isOwner ? (
                            <div className="mt-3 flex items-center gap-2">
                              <select
                                value={member.role}
                                onChange={(event) =>
                                  void handleRoleChange(
                                    member.id,
                                    event.target.value,
                                  )
                                }
                                className="field-surface min-w-0 flex-1 rounded-full px-3 py-1.5 text-xs"
                              >
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                              </select>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleRemoveMember(member.id)
                                }
                                className="glass-button rounded-full px-3 py-1.5 text-xs text-white/60 hover:text-red-100"
                              >
                                Remove
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="soft-panel rounded-[26px] p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        Project settings
                      </p>
                      <p className="mt-1 text-xs text-white/42">
                        Name and description
                      </p>
                    </div>
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-white/7 text-[#cbbcff]">
                      <FolderSimple size={19} />
                    </span>
                  </div>

                  <form onSubmit={handleProjectUpdate} className="space-y-3">
                    <input
                      name="name"
                      disabled={!canEdit}
                      defaultValue={project.name}
                      className="field-surface w-full rounded-[16px] px-3 py-2 text-sm disabled:opacity-60"
                    />
                    <textarea
                      name="description"
                      rows={3}
                      disabled={!canEdit}
                      defaultValue={project.description || ""}
                      className="field-surface w-full resize-none rounded-[16px] px-3 py-2 text-sm disabled:opacity-60"
                    />
                    {canEdit ? (
                      <button className="glass-button w-full rounded-full px-4 py-2 text-sm font-medium text-white/76">
                        Save project
                      </button>
                    ) : null}
                  </form>

                  {canManageMembers ? (
                    <button
                      type="button"
                      onClick={handleDeleteProject}
                      className="mt-3 w-full rounded-full border border-red-400/22 bg-red-500/8 px-4 py-2 text-sm font-medium text-red-100 transition hover:border-red-300/40 active:scale-[0.99]"
                    >
                      Delete project
                    </button>
                  ) : null}
                </section>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
