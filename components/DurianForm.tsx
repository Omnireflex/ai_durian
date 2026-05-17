"use client";

import type { FormValues } from "@/types/durian";

type DurianFormProps = {
  values: FormValues;
  onChange: (next: FormValues) => void;
};

type Option<T extends string> = { label: string; value: T };

function OptionGrid<T extends string>({
  name,
  value,
  options,
  onSelect,
}: {
  name: string;
  value: T;
  options: Option<T>[];
  onSelect: (next: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={`${name}-${option.value}`}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
              isSelected
                ? "border-[#F8C537] bg-[#FFF9E8] text-[#2E5E3E]"
                : "border-[#E5E5E5] bg-white text-[#222222]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function DurianForm({ values, onChange }: DurianFormProps) {
  return (
    <section className="space-y-5 rounded-3xl border border-[#EFE8D7] bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-[#222222]">第二步：补充现场信息</h2>
        <p className="mt-1 text-sm text-[#666666]">
          气味、敲击声和手感是图片看不到的信息，补充后判断会更稳。
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-[#222222]">榴莲品种</label>
        <select
          value={values.variety}
          onChange={(event) => onChange({ ...values, variety: event.target.value })}
          className="w-full rounded-xl border border-[#E5E5E5] px-3 py-3 text-sm outline-none focus:border-[#F8C537]"
        >
          {["不知道", "金枕", "猫山王", "苏丹王", "黑刺", "干尧", "其他"].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#222222]">售卖方式</p>
        <OptionGrid
          name="saleType"
          value={values.saleType}
          onSelect={(saleType) => onChange({ ...values, saleType })}
          options={[
            { label: "整颗按斤卖", value: "whole_by_weight" },
            { label: "整颗按个卖", value: "whole_by_piece" },
            { label: "已开盒果肉", value: "opened_box" },
            { label: "冷冻果肉", value: "frozen_pulp" },
            { label: "不确定", value: "unknown" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[#222222]">价格</label>
          <input
            value={values.price}
            onChange={(event) => onChange({ ...values, price: event.target.value })}
            placeholder="例如：128"
            inputMode="decimal"
            className="w-full rounded-xl border border-[#E5E5E5] px-3 py-3 text-sm outline-none focus:border-[#F8C537]"
          />
          <p className="text-xs text-[#666666]">元 / 颗 或 元 / 斤</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[#222222]">重量</label>
          <input
            value={values.weightKg}
            onChange={(event) => onChange({ ...values, weightKg: event.target.value })}
            placeholder="例如：2.5"
            inputMode="decimal"
            className="w-full rounded-xl border border-[#E5E5E5] px-3 py-3 text-sm outline-none focus:border-[#F8C537]"
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#222222]">闻起来怎么样？</p>
        <OptionGrid
          name="smell"
          value={values.smell}
          onSelect={(smell) => onChange({ ...values, smell })}
          options={[
            { label: "没什么味道", value: "none" },
            { label: "淡淡榴莲香", value: "light" },
            { label: "明显香味", value: "obvious" },
            { label: "很浓很冲", value: "strong" },
            { label: "发酸/酒味明显", value: "sour_or_alcoholic" },
            { label: "不确定", value: "unknown" },
          ]}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#222222]">敲起来是什么声音？</p>
        <OptionGrid
          name="tapSound"
          value={values.tapSound}
          onSelect={(tapSound) => onChange({ ...values, tapSound })}
          options={[
            { label: "实心闷响", value: "solid_dull" },
            { label: "轻微空响", value: "slightly_hollow" },
            { label: "很空很散", value: "very_hollow" },
            { label: "不确定", value: "unknown" },
          ]}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#222222]">拿起来感觉怎么样？</p>
        <OptionGrid
          name="weightFeeling"
          value={values.weightFeeling}
          onSelect={(weightFeeling) => onChange({ ...values, weightFeeling })}
          options={[
            { label: "比看起来重", value: "heavier_than_looks" },
            { label: "差不多", value: "normal" },
            { label: "比看起来轻", value: "lighter_than_looks" },
            { label: "不确定", value: "unknown" },
          ]}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#222222]">你喜欢哪种口感？</p>
        <OptionGrid
          name="tastePreference"
          value={values.tastePreference}
          onSelect={(tastePreference) => onChange({ ...values, tastePreference })}
          options={[
            { label: "脆甜清香", value: "crisp_sweet" },
            { label: "糯甜奶油", value: "creamy_sweet" },
            { label: "浓郁酒香", value: "strong_aroma" },
            { label: "越熟越好", value: "very_ripe" },
            { label: "我也不知道", value: "not_sure" },
          ]}
        />
      </div>
    </section>
  );
}
