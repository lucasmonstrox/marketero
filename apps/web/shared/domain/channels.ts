/**
 * Canais sociais e de venda do Marketero (design-system §5.2). Cada canal tem
 * cor própria via token `--channel-*`, usada SEMPRE como acento pontual
 * (badge/ícone/borda lateral) — nunca como fundo de superfície.
 *
 * As classes Tailwind aqui são LITERAIS de propósito: o JIT do Tailwind v4 só
 * gera utilitários que encontra escritos por inteiro no código-fonte. Não
 * construa nomes de classe por template string (`bg-channel-${id}`) — não seriam
 * detectados. Importe `CHANNEL_META[id].bg` etc.
 */

export type Channel =
  | "instagram"
  | "facebook"
  | "whatsapp"
  | "tiktok"
  | "x"
  | "mercadolivre"
  | "web"

export interface ChannelMeta {
  id: Channel
  label: string
  /** `text-channel-*` — cor da marca do canal para texto/ícone. */
  text: string
  /** `bg-channel-*` — fundo saturado (usar com o foreground do canal). */
  bg: string
  /** `bg-channel-*-foreground` — texto legível sobre `bg`. */
  fg: string
  /** `border-channel-*` — borda/realce lateral. */
  border: string
  /** Tinta suave do canal para realces sutis (ex.: bg-channel-web/10). */
  soft: string
}

export const CHANNEL_META: Record<Channel, ChannelMeta> = {
  instagram: {
    id: "instagram",
    label: "Instagram",
    text: "text-channel-instagram",
    bg: "bg-channel-instagram",
    fg: "text-channel-instagram-foreground",
    border: "border-channel-instagram",
    soft: "bg-channel-instagram/10",
  },
  facebook: {
    id: "facebook",
    label: "Facebook",
    text: "text-channel-facebook",
    bg: "bg-channel-facebook",
    fg: "text-channel-facebook-foreground",
    border: "border-channel-facebook",
    soft: "bg-channel-facebook/10",
  },
  whatsapp: {
    id: "whatsapp",
    label: "WhatsApp",
    text: "text-channel-whatsapp",
    bg: "bg-channel-whatsapp",
    fg: "text-channel-whatsapp-foreground",
    border: "border-channel-whatsapp",
    soft: "bg-channel-whatsapp/10",
  },
  tiktok: {
    id: "tiktok",
    label: "TikTok",
    text: "text-channel-tiktok",
    bg: "bg-channel-tiktok",
    fg: "text-channel-tiktok-foreground",
    border: "border-channel-tiktok",
    soft: "bg-channel-tiktok/10",
  },
  x: {
    id: "x",
    label: "X",
    text: "text-channel-x",
    bg: "bg-channel-x",
    fg: "text-channel-x-foreground",
    border: "border-channel-x",
    soft: "bg-channel-x/10",
  },
  mercadolivre: {
    id: "mercadolivre",
    label: "Mercado Livre",
    text: "text-channel-mercadolivre",
    bg: "bg-channel-mercadolivre",
    fg: "text-channel-mercadolivre-foreground",
    border: "border-channel-mercadolivre",
    soft: "bg-channel-mercadolivre/10",
  },
  web: {
    id: "web",
    label: "Web",
    text: "text-channel-web",
    bg: "bg-channel-web",
    fg: "text-channel-web-foreground",
    border: "border-channel-web",
    soft: "bg-channel-web/10",
  },
}

export const CHANNELS: Channel[] = Object.keys(CHANNEL_META) as Channel[]

/** Canais cobertos pelo MVP (kanban.md §Roadmap — TikTok/X são fase futura). */
export const MVP_CHANNELS: Channel[] = [
  "instagram",
  "facebook",
  "whatsapp",
  "mercadolivre",
  "web",
]
