import React from 'react'

export default function FarmMetricCards({ metrics }) {
    const {
        overallYield,
        processingLoss,
        conversionEfficiency,
        qualityRetention,
        firstQty,
        lastQty,
        stageCount,
    } = metrics || {}

    const hasQuantityData = firstQty != null && firstQty > 0

    const cards = [
        {
            label: 'Overall Yield',
            value: hasQuantityData ? `${overallYield}%` : 'N/A',
            sub: hasQuantityData ? `Output from initial input across ${stageCount} stages` : 'No quantity data available',
            color: 'text-emerald-600',
            bg: 'bg-white',
            border: 'border-gray-200',
            positive: true,
        },
        {
            label: 'Processing Loss',
            value: hasQuantityData ? `${processingLoss}%` : 'N/A',
            sub: 'Avg. drop between consecutive stages',
            color: 'text-blue-600',
            bg: 'bg-white',
            border: 'border-gray-200',
            positive: null,
        },
        {
            label: 'Conversion Efficiency',
            value: hasQuantityData ? `${conversionEfficiency}%` : 'N/A',
            sub: 'Mid-point output vs. initial raw input',
            color: 'text-emerald-600',
            bg: 'bg-white',
            border: 'border-gray-200',
            positive: true,
        },
        {
            label: 'Quality Retention',
            value: hasQuantityData ? `${qualityRetention}%` : 'N/A',
            sub: 'Final output compared to raw material',
            color: 'text-emerald-600',
            bg: 'bg-white',
            border: 'border-gray-200',
            positive: true,
        },
    ]

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map(card => (
                <div
                    key={card.label}
                    className={`rounded-xl border ${card.border} ${card.bg} p-6 flex flex-col gap-1 shadow-sm hover:shadow-md transition-shadow duration-200`}
                >
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{card.label}</p>
                    <p className={`text-3xl font-black mt-2 ${card.value === 'N/A' ? 'text-gray-300' : card.color}`}>
                        {card.value}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1 leading-tight">{card.sub}</p>
                </div>
            ))}
        </div>
    )
}