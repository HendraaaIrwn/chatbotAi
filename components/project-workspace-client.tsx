"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <Link href="/dashboard" className="text-sm text-amber-300">
              Back to dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-semibold">{project.name}</h1>
            <p className="mt-2 text-sm text-slate-400">
              {project.description || "No description"}
            </p>
          </div>
          <span className="rounded-md border border-slate-700 px-3 py-1 text-xs font-semibold uppercase text-slate-300">
            {project.role}
          </span>
        </div>

        {error ? (
          <p className="mt-6 rounded-md border border-red-900/60 bg-red-950/50 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-6 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
            {notice}
          </p>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Project settings</h2>
            <form onSubmit={handleProjectUpdate} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm text-slate-300">Name</span>
                <input
                  name="name"
                  disabled={!canEdit}
                  defaultValue={project.name}
                  className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-amber-300 disabled:opacity-60"
                />
              </label>
              <label className="block">
                <span className="text-sm text-slate-300">Description</span>
                <textarea
                  name="description"
                  rows={4}
                  disabled={!canEdit}
                  defaultValue={project.description || ""}
                  className="mt-2 w-full resize-none rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-amber-300 disabled:opacity-60"
                />
              </label>
              {canEdit ? (
                <button className="w-full rounded-md bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-200">
                  Save project
                </button>
              ) : null}
            </form>

            {canManageMembers ? (
              <button
                onClick={handleDeleteProject}
                className="mt-4 w-full rounded-md border border-red-800 px-4 py-2 text-sm font-semibold text-red-200 hover:border-red-500"
              >
                Delete project
              </button>
            ) : null}
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Collaborators</h2>
            {canManageMembers ? (
              <form
                onSubmit={handleAddMember}
                className="mt-5 grid gap-3 md:grid-cols-[1fr_140px_auto]"
              >
                <input
                  required
                  type="email"
                  name="email"
                  className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-amber-300"
                  placeholder="teammate@example.com"
                />
                <select
                  name="role"
                  className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-amber-300"
                  defaultValue="viewer"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <button className="rounded-md bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-200">
                  Add
                </button>
              </form>
            ) : null}

            <div className="mt-5 divide-y divide-slate-800">
              {members.map((member) => {
                const isOwner = member.role === "owner";

                return (
                  <div
                    key={member.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-100">
                        {member.user.name || member.user.email}
                      </p>
                      <p className="text-xs text-slate-500">
                        {member.user.email}
                      </p>
                    </div>
                    {canManageMembers && !isOwner ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={member.role}
                          onChange={(event) =>
                            void handleRoleChange(member.id, event.target.value)
                          }
                          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs outline-none focus:border-amber-300"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                        </select>
                        <button
                          onClick={() => void handleRemoveMember(member.id)}
                          className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-red-500 hover:text-red-200"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <span className="rounded-md border border-slate-700 px-2 py-1 text-xs uppercase text-slate-300">
                        {member.role}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-5">
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <form onSubmit={handlePromptSave}>
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold">Agent prompt</h2>
                  {canEdit ? (
                    <button className="rounded-md bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-200">
                      Save prompt
                    </button>
                  ) : null}
                </div>
                <textarea
                  value={promptContent}
                  onChange={(event) => setPromptContent(event.target.value)}
                  disabled={!canEdit}
                  rows={8}
                  className="mt-4 w-full resize-none rounded-md border border-slate-700 bg-slate-950 px-3 py-3 text-sm leading-6 text-slate-100 outline-none focus:border-amber-300 disabled:opacity-60"
                />
              </form>

              <div>
                <h2 className="text-lg font-semibold">Chat</h2>
                <div className="mt-4 min-h-72 space-y-3 rounded-md border border-slate-800 bg-slate-950 p-4">
                  {chatMessages.length ? (
                    chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={
                          message.role === "assistant"
                            ? "rounded-md bg-slate-900 px-3 py-2 text-sm text-slate-100"
                            : "rounded-md bg-amber-300 px-3 py-2 text-sm text-slate-950"
                        }
                      >
                        <p className="mb-1 text-xs font-semibold uppercase opacity-70">
                          {message.role}
                        </p>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No messages yet.</p>
                  )}
                </div>
                <form onSubmit={handleChatSubmit} className="mt-4 flex gap-3">
                  <input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-amber-300"
                    placeholder="Ask this agent..."
                  />
                  <button
                    disabled={isChatting}
                    className="rounded-md bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-200 disabled:opacity-60"
                  >
                    {isChatting ? "Sending..." : "Send"}
                  </button>
                </form>
              </div>
            </div>

            <aside>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold">Files</h2>
                <span className="text-xs text-slate-500">
                  {selectedFileIds.length} selected
                </span>
              </div>

              {canEdit ? (
                <form onSubmit={handleFileUpload} className="mt-4 space-y-3">
                  <input
                    required
                    name="file"
                    type="file"
                    accept=".pdf,.txt,.md,.csv,.json,.docx"
                    className="block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1 file:text-sm file:text-slate-100"
                  />
                  <button
                    disabled={isUploading}
                    className="w-full rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-amber-300 disabled:opacity-60"
                  >
                    {isUploading ? "Uploading..." : "Upload file"}
                  </button>
                </form>
              ) : null}

              <div className="mt-5 space-y-2">
                {files.length ? (
                  files.map((file) => (
                    <label
                      key={file.id}
                      className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-800 bg-slate-950 px-3 py-3"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFileIds.includes(file.id)}
                        onChange={() => toggleSelectedFile(file.id)}
                        className="mt-1"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-100">
                          {file.filename}
                        </span>
                        <span className="text-xs text-slate-500">
                          {(file.bytes / 1024).toFixed(1)} KB
                        </span>
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="rounded-md border border-dashed border-slate-700 px-3 py-6 text-center text-sm text-slate-500">
                    No files uploaded.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
