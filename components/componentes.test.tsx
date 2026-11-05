// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AcoesMateriais } from './AcoesMateriais'
import { BarraInferior } from './BarraInferior'
import { Botao } from './Botao'
import { ChaveModo } from './ChaveModo'
import { Contador } from './Contador'
import { IconeFerramenta } from './IconeFerramenta'
import { LinhaExtrato } from './LinhaExtrato'
import type { LinhaExtrato as LinhaExtratoDados } from '@/lib/dados/materiais'
import { ListaSaldos } from './ListaSaldos'
import {
  CHAVES_ICONE,
  GRUPOS_ICONE,
  ICONES_FERRAMENTA,
  ehChaveIcone,
  ehIcone,
} from './icones-ferramenta'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

afterEach(cleanup)

describe('ícones de ferramenta', () => {
  it('mantém os 13 ícones do protótipo e cada um tem grupo', () => {
    for (const chave of [
      'pa',
      'enxada',
      'carrinho',
      'colher',
      'regua',
      'linha',
      'furadeira',
      'martelete',
      'esmerilhadeira',
      'serra_circular',
      'martelo',
      'escada',
      'extensao',
    ]) {
      expect(CHAVES_ICONE).toContain(chave)
    }
    for (const chave of CHAVES_ICONE)
      expect(GRUPOS_ICONE[ICONES_FERRAMENTA[chave].grupo]).toBeTruthy()
  })

  it('a constraint do banco aceita exatamente as chaves do código', () => {
    const sql = readFileSync('supabase/migrations/20261013040000_icone_proprio.sql', 'utf8')
    const lista = sql.slice(sql.indexOf('icone in ('), sql.indexOf(')', sql.indexOf('icone in (')))
    const doBanco = [...lista.matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
    expect(doBanco.toSorted()).toEqual([...CHAVES_ICONE].toSorted())
  })

  it('reconhece ícone próprio só no formato do Storage', () => {
    expect(
      ehIcone(
        'arquivo:a0000000-0000-4000-8000-000000000001/e8000000-0000-4000-8000-000000000001.png',
      ),
    ).toBe(true)
    expect(ehIcone('arquivo:https://exemplo.com/x.png')).toBe(false)
    expect(ehIcone('pa')).toBe(true)
  })

  it('reconhece só chaves válidas', () => {
    expect(ehChaveIcone('pa')).toBe(true)
    expect(ehChaveIcone('toString')).toBe(false)
  })

  it('sempre escreve o nome embaixo do ícone', () => {
    render(<IconeFerramenta icone="serra_circular" />)
    expect(screen.getByText(ICONES_FERRAMENTA.serra_circular.nome)).toBeDefined()
    render(<IconeFerramenta icone="pa" nome="Pá de bico" />)
    expect(screen.getByText('Pá de bico')).toBeDefined()
  })
})

describe('Contador', () => {
  it('soma e tira dentro dos limites', () => {
    const onChange = vi.fn()
    render(<Contador valor={1} maximo={2} rotulo="Pá" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar Pá' }))
    fireEvent.click(screen.getByRole('button', { name: 'Diminuir Pá' }))
    expect(onChange.mock.calls).toEqual([[2], [0]])
  })

  it('desabilita os botões nos limites', () => {
    render(<Contador valor={0} maximo={0} rotulo="Pá" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Diminuir Pá' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Aumentar Pá' }).hasAttribute('disabled')).toBe(true)
  })
})

describe('Botao', () => {
  it('é um <button type="button"> por padrão', () => {
    render(<Botao>Retirada</Botao>)
    const botao = screen.getByRole('button', { name: 'Retirada' })
    expect(botao.tagName).toBe('BUTTON')
    expect(botao.getAttribute('type')).toBe('button')
  })
})

describe('modo Materiais', () => {
  it('ChaveModo grava o cookie e navega ao trocar de modo', () => {
    push.mockClear()
    render(<ChaveModo modo="ferramentas" />)
    fireEvent.click(screen.getByRole('button', { name: 'Materiais' }))
    expect(document.cookie).toContain('almox_modo=materiais')
    expect(push).toHaveBeenCalledWith('/materiais')
    push.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Ferramentas' }))
    expect(push).not.toHaveBeenCalled()
  })

  it('ChaveModo marca o botão ativo com aria-pressed', () => {
    render(<ChaveModo modo="materiais" />)
    expect(screen.getByRole('button', { name: 'Materiais' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(screen.getByRole('button', { name: 'Ferramentas' }).getAttribute('aria-pressed')).toBe(
      'false',
    )
  })

  it('BarraInferior de materiais esconde Fechamento e Cadastros da consulta', () => {
    render(<BarraInferior modo="materiais" ativa="inicio-materiais" podeLancar={false} />)
    expect(screen.getByText('Saldos')).toBeTruthy()
    expect(screen.getByText('Extrato')).toBeTruthy()
    expect(screen.queryByText('Fechamento')).toBeNull()
    expect(screen.queryByText('Cadastros')).toBeNull()
  })

  it('BarraInferior de materiais mostra tudo para o engenheiro', () => {
    render(<BarraInferior modo="materiais" ativa="saldos" podeLancar podeCadastrar />)
    expect(screen.getByText('Fechamento')).toBeTruthy()
    expect(screen.getByText('Cadastros')).toBeTruthy()
  })

  it('BarraInferior de materiais esconde Cadastros do almoxarife (lança, mas não cadastra)', () => {
    render(<BarraInferior modo="materiais" ativa="saldos" podeLancar />)
    expect(screen.getByText('Fechamento')).toBeTruthy()
    expect(screen.queryByText('Cadastros')).toBeNull()
  })

  it('BarraInferior de ferramentas continua mostrando Cadastros ao almoxarife', () => {
    render(<BarraInferior ativa="inicio" podeLancar />)
    expect(screen.getByText('Cadastros')).toBeTruthy()
  })

  it('AcoesMateriais não renderiza nada para a consulta', () => {
    const { container } = render(<AcoesMateriais podeLancar={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('ListaSaldos põe o material abaixo do limite primeiro', () => {
    render(
      <ListaSaldos
        materiais={[
          {
            id: 'a',
            nome: 'Areia',
            unidade: 'm³',
            saldo: 50,
            estoqueCheio: 50,
            aviso: { tipo: 'quantidade', valor: 10 },
          },
          {
            id: 'b',
            nome: 'Cimento',
            unidade: 'sc',
            saldo: 5,
            estoqueCheio: 100,
            aviso: { tipo: 'quantidade', valor: 10 },
          },
        ]}
      />,
    )
    const links = screen.getAllByRole('link')
    expect(links[0]!.textContent).toContain('Cimento')
    expect(links[0]!.textContent).toContain('limite 10')
    expect(links[0]!.getAttribute('href')).toBe('/materiais/b')
  })
})

describe('LinhaExtrato', () => {
  const base: LinhaExtratoDados = {
    id: 'm1',
    obraId: 'o1',
    materialId: 'mat1',
    tipo: 'saida',
    quantidadeOriginal: -100,
    quantidade: -100,
    apagado: false,
    desfeito: false,
    editadoPorNome: null,
    editadoEm: null,
    usuarioNome: 'Sebastião',
    criadoEm: new Date().toISOString(),
    registradoNoAparelhoEm: null,
    materialNome: 'Cimento',
    unidade: 'sc',
  }

  it('divergência de conferência mostra "não altera o saldo"', () => {
    render(
      <LinhaExtrato
        linha={{ ...base, tipo: 'conferencia', quantidade: -22, quantidadeOriginal: -22 }}
        comNome={false}
        editavel={false}
      />,
    )
    expect(screen.getByText('Conferência · divergência')).toBeTruthy()
    expect(screen.getByText(/não altera o saldo/)).toBeTruthy()
  })

  it('conferência sem diferença mostra "Conferência ok"', () => {
    render(
      <LinhaExtrato
        linha={{ ...base, tipo: 'conferencia', quantidade: 0, quantidadeOriginal: 0 }}
        comNome={false}
        editavel={false}
      />,
    )
    expect(screen.getByText('Conferência ok')).toBeTruthy()
  })

  it('editada mostra "(era −100)" e quem editou', () => {
    render(
      <LinhaExtrato
        linha={{
          ...base,
          quantidade: -80,
          editadoPorNome: 'Marcos',
          editadoEm: new Date().toISOString(),
        }}
        comNome={false}
        editavel={false}
      />,
    )
    expect(screen.getByText(/editado por Marcos às \d\d:\d\d \(era −100\)/)).toBeTruthy()
  })

  it('apagada tem line-through e "apagado por"', () => {
    const { container } = render(
      <LinhaExtrato
        linha={{
          ...base,
          apagado: true,
          editadoPorNome: null,
          editadoEm: new Date().toISOString(),
        }}
        comNome={false}
        editavel={false}
      />,
    )
    expect(container.querySelector('.line-through')).toBeTruthy()
    expect(screen.getByText(/apagado por — às/)).toBeTruthy()
  })

  it('lançamento do aparelho mostra "sincronizado às"', () => {
    render(
      <LinhaExtrato
        linha={{ ...base, registradoNoAparelhoEm: new Date().toISOString() }}
        comNome={false}
        editavel={false}
      />,
    )
    expect(screen.getByText(/lançado às \d\d:\d\d, sincronizado às \d\d:\d\d/)).toBeTruthy()
  })

  it('nome vazio vira "—" e o botão Editar chama onEditar', () => {
    const onEditar = vi.fn()
    render(
      <LinhaExtrato linha={{ ...base, usuarioNome: null }} comNome editavel onEditar={onEditar} />,
    )
    expect(screen.getByText(/· —/)).toBeTruthy()
    expect(screen.getByText('Cimento')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Editar/ }))
    expect(onEditar).toHaveBeenCalledOnce()
  })
})
