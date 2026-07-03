import React from 'react'

const STAGE_ICONS = [
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
    </svg>,
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>,
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>,
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>,
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>,
]

export default function FarmFlowSummary({ stages }) {
    if (!stages || stages.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center text-sm text-gray-400">
                No workflow stages found for this project.
            </div>
        )
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <h2 className="text-sm font-bold text-gray-900">Transformation Flow</h2>
                    <span className="ml-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                        {stages.length} stages
                    </span>
                </div>
            </div>

            <div className="px-6 py-8 overflow-x-auto">
                <div className="flex items-stretch gap-0 min-w-max">
                    {stages.map((stage, idx) => {
                        const isLast = idx === stages.length - 1
                        const icon = STAGE_ICONS[idx % STAGE_ICONS.length]

                        return (
                            <div key={stage.id} className="flex items-center">
                                <div className="flex flex-col items-center w-44">
                                    <div className={`
                    w-full rounded-xl border-2 p-4 flex flex-col items-center gap-3 transition-shadow duration-200 hover:shadow-md
                    ${stage.completed
                                            ? 'border-emerald-200 bg-emerald-50'
                                            : idx === 0
                                                ? 'border-blue-200 bg-blue-50'
                                                : 'border-gray-200 bg-white'
                                        }
                  `}>
                                        <div className={`
                      w-16 h-16 rounded-xl flex items-center justify-center
                      ${stage.completed ? 'text-emerald-600' : idx === 0 ? 'text-blue-500' : 'text-gray-400'}
                    `}>
                                            {icon}
                                        </div>

                                        <div className="text-center w-full">
                                            <p className="text-xs font-black text-gray-900 uppercase tracking-wide leading-tight">
                                                {stage.stageName}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1 truncate w-full text-center" title={stage.material}>
                                                {stage.material || 'N/A'}
                                            </p>
                                            <p className="text-sm font-bold text-gray-800 mt-2">
                                                {stage.quantity != null
                                                    ? `${Number(stage.quantity).toLocaleString()} ${stage.unit}`
                                                    : 'N/A'
                                                }
                                            </p>
                                        </div>

                                        {stage.completed && (
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-white border border-emerald-200 px-2 py-0.5 rounded-full">
                                                Complete
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {!isLast && (
                                    <div className="flex items-center mx-1 self-center mt-0">
                                        <div className="w-6 h-0.5 bg-gray-200"></div>
                                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <div className="w-6 h-0.5 bg-gray-200"></div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}