"use client";

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + second).toUpperCase() || "?";
}

export function UserAvatar({
  name,
  avatarUrl,
  size = 32
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={name}
        className="flex-shrink-0 rounded-full object-cover"
        src={avatarUrl}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full bg-violet-600 font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </div>
  );
}
