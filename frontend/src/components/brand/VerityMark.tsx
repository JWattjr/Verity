import Image from "next/image"

type VerityMarkProps = {
  className?: string
  priority?: boolean
  size: number
}

export default function VerityMark({
  className = "",
  priority = false,
  size,
}: VerityMarkProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={`shrink-0 object-contain ${className}`}
      height={size}
      priority={priority}
      src="/verity-logo-mark.png"
      width={size}
    />
  )
}
