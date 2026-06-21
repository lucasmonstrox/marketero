import {
  ENGAGEMENT_CELLS,
  ENGAGEMENT_DAYS,
  ENGAGEMENT_SLOTS,
} from "../_data/engagement"

/**
 * "Horário de engajamento" — grade dia × faixa horária tingida por uma rampa
 * sequencial da hue da marca (var(--chart-1) com opacidade ∝ intensidade). Não
 * é só cor: cada célula tem `title` com o valor e há legenda de menor→maior.
 * Ajuda a achar a janela de pico p/ reforçar atendimento.
 */

function intensityToOpacity(value: number) {
  // 0–100 → 0.06–1.0 (mantém piso visível p/ células baixas)
  return 0.06 + (value / 100) * 0.94
}

export function EngagementHeatmap() {
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `auto repeat(${ENGAGEMENT_SLOTS.length}, minmax(2rem, 1fr))`,
          }}
        >
          {/* Cabeçalho de faixas horárias */}
          <div />
          {ENGAGEMENT_SLOTS.map((slot) => (
            <div
              key={slot}
              className="text-muted-foreground text-center text-[11px]"
            >
              {slot}
            </div>
          ))}

          {/* Linhas por dia */}
          {ENGAGEMENT_DAYS.map((day) => (
            <div key={day} className="contents">
              <div className="text-muted-foreground flex items-center pr-1 text-[11px]">
                {day}
              </div>
              {ENGAGEMENT_SLOTS.map((slot, slotIndex) => {
                const cell = ENGAGEMENT_CELLS.find(
                  (c) => c.day === day && c.slot === slotIndex
                )
                const value = cell?.value ?? 0
                return (
                  <div
                    key={`${day}-${slot}`}
                    title={`${day} ${slot} · intensidade ${value}/100`}
                    className="aspect-[3/2] rounded-md ring-1 ring-foreground/5"
                    style={{
                      backgroundColor: "var(--chart-1)",
                      opacity: intensityToOpacity(value),
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legenda sequencial */}
      <div className="flex items-center justify-end gap-2 text-[11px]">
        <span className="text-muted-foreground">Menor</span>
        <div className="flex items-center gap-0.5">
          {[0.12, 0.32, 0.52, 0.72, 0.94].map((op) => (
            <span
              key={op}
              className="size-3 rounded-sm ring-1 ring-foreground/5"
              style={{ backgroundColor: "var(--chart-1)", opacity: op }}
            />
          ))}
        </div>
        <span className="text-muted-foreground">Maior</span>
      </div>
    </div>
  )
}
