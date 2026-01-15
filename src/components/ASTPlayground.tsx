'use client'
import { useState } from 'react'
import { ChevronRight, ChevronDown, Code2, Network, AlertCircle } from 'lucide-react'

const DEMO_CODE = `def unsafe_query(user_input):
    # Skylos detects this security flaw
    query = f"SELECT * FROM users WHERE name = '{user_input}'"
    return db.execute(query)`

const DEMO_AST = {
  type: "FunctionDef",
  name: "unsafe_query",
  body: [
    {
      type: "Assign",
      targets: [{ type: "Name", id: "query" }],
      value: {
        type: "JoinedStr (f-string)",
        risk: "CRITICAL",
        values: [
          { type: "Constant", value: "SELECT * ..." },
          { type: "FormattedValue", value: "user_input" }
        ]
      }
    },
    {
      type: "Return",
      value: {
        type: "Call",
        func: "db.execute",
        tainted: true
      }
    }
  ]
}

export default function ASTPlayground() {
  return (
    <div className="w-full bg-[#0f111a] border border-white/10 rounded-lg overflow-hidden flex flex-col md:flex-row h-[350px] shadow-2xl">
      
      <div className="flex-1 border-r border-white/5 flex flex-col min-w-0">
        <div className="h-9 bg-[#161822] border-b border-white/5 flex items-center px-4 gap-2 text-[10px] font-mono text-slate-400">
          <Code2 className="w-3 h-3" /> unsafe.py
        </div>
        <div className="p-4 font-mono text-xs md:text-sm text-slate-300 flex-1 bg-[#0f111a] overflow-auto">
          <pre>{DEMO_CODE}</pre>
        </div>
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/10 text-[10px] md:text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-3 h-3 text-red-500" />
          <span>SKY-D201: SQL Injection risk detected</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[#0f111a] min-w-0">
        <div className="h-9 border-b border-white/5 flex items-center px-2 bg-[#161822]">
          <span className="px-2 py-0.5 text-[10px] font-medium text-slate-400 flex items-center gap-2">
            <Network className="w-3 h-3" /> Live AST Graph
          </span>
        </div>
        <div className="p-4 overflow-auto flex-1 font-mono text-[10px] md:text-xs text-slate-400">
           <TreeNode node={DEMO_AST} label="Module" />
        </div>
      </div>
    </div>
  )
}

function TreeNode({ node, label }: any) {
  const [isOpen, setIsOpen] = useState(true)
  const isObject = typeof node === 'object' && node !== null
  const isArray = Array.isArray(node)

  if (!isObject && !isArray) {
    return (
      <div className="pl-4 flex gap-2 py-0.5">
        <span className="text-slate-600">{label}:</span>
        <span className="text-orange-300">"{node}"</span>
      </div>
    )
  }

  return (
    <div className="pl-4 border-l border-white/5">
      <div 
        className="flex items-center gap-2 cursor-pointer hover:text-white text-blue-400 py-0.5 select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span className="text-slate-500">{label ? label : ''}</span>
        <span className="font-bold text-indigo-300">{node.type || 'List'}</span>
        {node.risk && <span className="ml-2 text-[9px] bg-red-500 text-white px-1 rounded font-bold">RISK</span>}
      </div>
      
      {isOpen && (
        <div>
          {Object.entries(node).map(([key, value]) => {
            if (key === 'type') return null
            return <TreeNode key={key} node={value} label={key} />
          })}
        </div>
      )}
    </div>
  )
}