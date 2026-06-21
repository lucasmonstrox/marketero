"use client"

import * as React from "react"

import { BlockPalette } from "./_components/block-palette"
import { BuilderCanvas } from "./_components/builder-canvas"
import { Inspector } from "./_components/inspector"
import { Toolbar } from "./_components/toolbar"
import {
  createBlock,
  createField,
  createInitialBlocks,
} from "./_data/blocks"
import { INITIAL_THEME } from "./_data/tenant"
import type {
  Block,
  BlockType,
  DeliveryMode,
  DeviceMode,
  FieldType,
  FormularioBlock,
  TenantTheme,
} from "./_data/types"

/**
 * Builder de páginas/formulários hosted + embedável, white-label/multi-tenant
 * (design-system §7.5 + §6 Eixo B). Construtor visual custom-lightweight: todo
 * o estado vive aqui em useState; o chrome do editor usa tokens do produto e o
 * preview renderiza sob `[data-tenant]` com a marca do tenant via CSS vars.
 */
export default function BuilderPage() {
  const [projectName, setProjectName] = React.useState("LP — Promo Decoração")
  const [blocks, setBlocks] = React.useState<Block[]>(() =>
    createInitialBlocks()
  )
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [theme, setTheme] = React.useState<TenantTheme>(INITIAL_THEME)
  const [device, setDevice] = React.useState<DeviceMode>("desktop")
  const [delivery, setDelivery] = React.useState<DeliveryMode>("hosted")
  const [inspectorTab, setInspectorTab] = React.useState<"bloco" | "tema">(
    "bloco"
  )

  const selectedBlock =
    blocks.find((block) => block.id === selectedId) ?? null

  const hasForm = blocks.some((block) => block.type === "formulario")

  /** Adiciona um novo bloco ao fim, seleciona-o e abre a aba "Bloco". */
  function handleAddBlock(type: BlockType) {
    const block = createBlock(type)
    setBlocks((prev) => [...prev, block])
    setSelectedId(block.id)
    setInspectorTab("bloco")
  }

  /**
   * Adiciona um campo: ao formulário selecionado se houver; senão ao primeiro
   * formulário da página. Seleciona o formulário e abre a aba "Bloco".
   */
  function handleAddField(type: FieldType) {
    const targetForm =
      selectedBlock?.type === "formulario"
        ? selectedBlock
        : (blocks.find((b) => b.type === "formulario") as
            | FormularioBlock
            | undefined)
    if (!targetForm) return

    const field = createField(type)
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === targetForm.id && block.type === "formulario"
          ? { ...block, fields: [...block.fields, field] }
          : block
      )
    )
    setSelectedId(targetForm.id)
    setInspectorTab("bloco")
  }

  function handleSelect(id: string) {
    setSelectedId(id)
    setInspectorTab("bloco")
  }

  function handleUpdateBlock(updated: Block) {
    setBlocks((prev) =>
      prev.map((block) => (block.id === updated.id ? updated : block))
    )
  }

  function handleMove(id: string, direction: "up" | "down") {
    setBlocks((prev) => {
      const idx = prev.findIndex((block) => block.id === id)
      if (idx < 0) return prev
      const target = direction === "up" ? idx - 1 : idx + 1
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const tmp = next[idx]!
      next[idx] = next[target]!
      next[target] = tmp
      return next
    })
  }

  function handleRemove(id: string) {
    setBlocks((prev) => prev.filter((block) => block.id !== id))
    setSelectedId((current) => (current === id ? null : current))
  }

  return (
    <div className="flex h-full flex-col">
      <Toolbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        device={device}
        onDeviceChange={setDevice}
        delivery={delivery}
        onDeliveryChange={setDelivery}
        blockCount={blocks.length}
      />

      <div className="flex min-h-0 flex-1">
        <BlockPalette
          onAddBlock={handleAddBlock}
          onAddField={handleAddField}
          hasForm={hasForm}
        />

        <BuilderCanvas
          blocks={blocks}
          theme={theme}
          device={device}
          selectedId={selectedId}
          onSelect={handleSelect}
          onMove={handleMove}
          onRemove={handleRemove}
        />

        <Inspector
          selectedBlock={selectedBlock}
          onBlockChange={handleUpdateBlock}
          theme={theme}
          onThemeChange={setTheme}
          tab={inspectorTab}
          onTabChange={setInspectorTab}
        />
      </div>
    </div>
  )
}
