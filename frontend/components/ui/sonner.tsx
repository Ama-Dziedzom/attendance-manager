"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl group-[.toaster]:p-4 group-[.toaster]:flex group-[.toaster]:items-center group-[.toaster]:gap-3 group-[.toaster]:relative",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-semibold group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:rounded-lg group-[.toast]:text-xs group-[.toast]:transition-all hover:group-[.toast]:opacity-90 active:group-[.toast]:scale-95",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:font-semibold group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:rounded-lg group-[.toast]:text-xs group-[.toast]:transition-all hover:group-[.toast]:bg-muted/80",
          closeButton:
            "group-[.toast]:bg-background group-[.toast]:text-muted-foreground group-[.toast]:border-border group-[.toast]:hover:text-foreground group-[.toast]:shadow-sm group-[.toast]:absolute group-[.toast]:right-2 group-[.toast]:top-2 group-[.toast]:transition-opacity group-[.toast]:opacity-0 group-hover:[.toast]:opacity-100",
          success: "group-[.toaster]:border-emerald-500/30",
          error: "group-[.toaster]:border-destructive/30",
          info: "group-[.toaster]:border-blue-500/30",
          warning: "group-[.toaster]:border-amber-500/30",
          loading: "group-[.toaster]:bg-background group-[.toaster]:text-foreground",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-5 text-emerald-600 dark:text-emerald-400" />,
        info: <InfoIcon className="size-5 text-blue-600 dark:text-blue-400" />,
        warning: <TriangleAlertIcon className="size-5 text-amber-600 dark:text-amber-400" />,
        error: <OctagonXIcon className="size-5 text-destructive" />,
        loading: <Loader2Icon className="size-5 text-primary animate-spin" />,
      }}
      closeButton
      {...props}
    />
  )
}

export { Toaster }
