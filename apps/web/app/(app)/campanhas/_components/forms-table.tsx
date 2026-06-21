import { CheckIcon, LinkIcon, MinusIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import { countCampaignsUsingForm } from "../_data/campaigns"
import {
  FIELD_TYPE_META,
  type FieldType,
  FORM_STATUS_META,
  FORMS,
} from "../_data/forms"
import { StatusBadge } from "./status-badge"

/** Tipos distintos de campo de um form, preservando a ordem de definição. */
function distinctFieldTypes(types: FieldType[]): FieldType[] {
  return [...new Set(types)]
}

/**
 * Tabela de Forms — cada Form é o "programa" (perguntas) que um Agente conduz.
 * Mostra nº de perguntas, tipos de campo (com a validação por trás), status,
 * vínculo com Instant Form da Meta e quantas campanhas o usam como override.
 */
export function FormsTable() {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Form</TableHead>
            <TableHead className="text-right">Perguntas</TableHead>
            <TableHead>Tipos de campo</TableHead>
            <TableHead>Meta</TableHead>
            <TableHead className="text-right">Campanhas</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {FORMS.map((form) => {
            const fieldTypes = distinctFieldTypes(
              form.questions.map((q) => q.type)
            )
            const requiredCount = form.questions.filter((q) => q.required).length
            const statusMeta = FORM_STATUS_META[form.status]
            const usedBy = countCampaignsUsingForm(form.id)

            return (
              <TableRow key={form.id}>
                <TableCell className="max-w-[18rem]">
                  <p className="truncate font-medium">{form.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {form.description}
                  </p>
                </TableCell>

                <TableCell className="text-right tabular-nums">
                  <span>{form.questions.length}</span>
                  <span className="text-muted-foreground text-xs">
                    {" "}
                    ({requiredCount} obrig.)
                  </span>
                </TableCell>

                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {fieldTypes.map((type) => {
                      const meta = FIELD_TYPE_META[type]
                      return (
                        <Tooltip key={type}>
                          <TooltipTrigger>
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] font-medium"
                            >
                              {meta.label}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>{meta.hint}</TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                </TableCell>

                <TableCell>
                  <MetaLink metaFormId={form.metaFormId} />
                </TableCell>

                <TableCell className="text-muted-foreground text-right tabular-nums">
                  {usedBy}
                </TableCell>

                <TableCell>
                  <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function MetaLink({ metaFormId }: { metaFormId: string | null }) {
  const linked = metaFormId !== null
  return (
    <Tooltip>
      <TooltipTrigger>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs",
            linked ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {linked ? (
            <>
              <LinkIcon className="size-3 shrink-0" aria-hidden="true" />
              <CheckIcon className="text-success size-3 shrink-0" aria-hidden="true" />
              Vinculado
            </>
          ) : (
            <>
              <MinusIcon className="size-3 shrink-0" aria-hidden="true" />
              Só plataforma
            </>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {linked
          ? `Sincronizado com Instant Form ${metaFormId}`
          : "Sem vínculo com Instant Form da Meta"}
      </TooltipContent>
    </Tooltip>
  )
}
