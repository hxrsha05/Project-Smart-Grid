import { toast } from "sonner";
import { X } from "lucide-react";

type PageToastProps = {
  title: string;
  description: string;
  icon?: React.ReactNode;
  accentClassName?: string;
};

export function showPageToast({
  title,
  description,
  icon,
  accentClassName = "bg-blue-500",
}: PageToastProps) {
  return toast.custom((id) => (
    <div className="relative w-[330px] overflow-hidden rounded-xl border border-border bg-background p-3 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
      <div className={`absolute left-0 top-0 h-full w-1 ${accentClassName}`} />
      <div className="absolute inset-y-0 left-0 w-24 opacity-15">
        <svg viewBox="0 0 120 80" className="h-full w-full rotate-90 fill-blue-400/30">
          <path d="M0,40 C20,10 40,10 60,40 C80,70 100,70 120,40 L120,80 L0,80 Z" />
        </svg>
      </div>

      <div className="relative flex items-center gap-3 pl-2 pr-7">
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 ${accentClassName} text-white`}>
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-5 text-foreground">
            {title}
          </p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        </div>

        <button
          type="button"
          onClick={() => toast.dismiss(id)}
          className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Dismiss toast"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  ));
}
