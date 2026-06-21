import {
  AtSignIcon,
  BellRingIcon,
  BotMessageSquareIcon,
  ClockIcon,
  FileInputIcon,
  GitBranchIcon,
  type LucideIcon,
  MessageCircleIcon,
  MessageSquareIcon,
  PackageCheckIcon,
  SendIcon,
  SparklesIcon,
  SplitIcon,
  StoreIcon,
  TagIcon,
  TargetIcon,
  TimerIcon,
  UserPlusIcon,
  WebhookIcon,
} from "lucide-react"

/**
 * Registro template → ícone lucide. Mantido como mapa estático (não construir
 * por template string) para que palette e nós leiam o MESMO ícone por tipo.
 */
export const TEMPLATE_ICON: Record<string, LucideIcon> = {
  // Gatilhos
  "trigger.comment": MessageCircleIcon,
  "trigger.dm": AtSignIcon,
  "trigger.whatsapp": MessageSquareIcon,
  "trigger.leadgen": TargetIcon,
  "trigger.webform": FileInputIcon,
  "trigger.order_paid": PackageCheckIcon,
  "trigger.marketplace": StoreIcon,
  "trigger.timer": TimerIcon,
  // IA
  "ai.classify": SparklesIcon,
  "ai.reply": BotMessageSquareIcon,
  "ai.suggest": SparklesIcon,
  // Ações
  "action.whatsapp": SendIcon,
  "action.tag": TagIcon,
  "action.assign": UserPlusIcon,
  "action.move": GitBranchIcon,
  "action.delay": ClockIcon,
  "action.webhook": WebhookIcon,
  "action.capi": TargetIcon,
  "action.timer": TimerIcon,
  "action.notify": BellRingIcon,
  // Condição
  "condition.ifelse": SplitIcon,
}

/** Fallback seguro caso um template não esteja no registro. */
export function templateIcon(template: string): LucideIcon {
  return TEMPLATE_ICON[template] ?? GitBranchIcon
}
