import type { ExerciseLibraryResponse } from '@repo/contracts';
import React from 'react';

export function ExerciseLibrary({
  result,
  filters,
}: {
  result: ExerciseLibraryResponse;
  filters: { search?: string; category?: string; anatomicalRegion?: string; equipment?: string };
}) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-text-secondary">Клінічний довідник</p>
        <h1 className="mt-1 font-serif text-3xl">Бібліотека вправ</h1>
        <p className="mt-2 max-w-3xl text-sm text-text-secondary">
          Нейтральні визначення вправ для індивідуальних призначень. Дозування та придатність
          визначає фахівець.
        </p>
      </header>
      <form
        method="get"
        className="grid gap-3 rounded-md border border-border bg-surface p-4 md:grid-cols-4"
      >
        <label className="text-xs text-text-secondary md:col-span-2">
          Пошук
          <input
            name="search"
            defaultValue={filters.search ?? ''}
            placeholder="Назва, код або опис"
            className="field"
          />
        </label>
        <label className="text-xs text-text-secondary">
          Категорія
          <select name="category" defaultValue={filters.category ?? ''} className="field">
            <option value="">Усі</option>
            <option value="MOBILITY">Мобільність</option>
            <option value="STRENGTH">Сила</option>
            <option value="BALANCE">Баланс</option>
            <option value="FUNCTIONAL">Функціональні</option>
            <option value="BREATHING">Дихання</option>
          </select>
        </label>
        <label className="text-xs text-text-secondary">
          Ділянка
          <select
            name="anatomicalRegion"
            defaultValue={filters.anatomicalRegion ?? ''}
            className="field"
          >
            <option value="">Усі</option>
            <option value="knee">Коліно</option>
            <option value="hip">Кульшовий суглоб</option>
            <option value="ankle">Гомілковостопний суглоб</option>
            <option value="shoulder">Плече</option>
          </select>
        </label>
        <label className="text-xs text-text-secondary md:col-span-2">
          Обладнання
          <input
            name="equipment"
            defaultValue={filters.equipment ?? ''}
            placeholder="Наприклад, килимок"
            className="field"
          />
        </label>
        <div className="flex items-end gap-2 md:col-span-2">
          <button className="rc-btn rc-btn-primary">Застосувати</button>
          <a href="/app/exercises" className="rc-btn rc-btn-ghost">
            Скинути
          </a>
        </div>
      </form>
      <p className="text-sm text-text-secondary">Знайдено: {result.total}</p>
      {result.items.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {result.items.map((exercise) => (
            <a
              href={`/app/exercises/${exercise.id}`}
              key={exercise.id}
              className="rounded-md border border-border bg-surface p-5 transition hover:border-info/50"
            >
              <div className="flex justify-between gap-3">
                <strong>{exercise.name}</strong>
                <span className="text-xs text-text-secondary">{exercise.category}</span>
              </div>
              <p className="mt-2 text-sm text-text-secondary">{exercise.description}</p>
              <div className="mt-4 flex flex-wrap gap-1">
                {exercise.anatomicalRegions.map((region) => (
                  <span key={region} className="rounded-full bg-surface-muted px-2 py-1 text-xs">
                    {region}
                  </span>
                ))}
                {exercise.equipment.map((item) => (
                  <span key={item} className="rounded-full bg-surface-muted px-2 py-1 text-xs">
                    {item}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-border p-8 text-sm text-text-secondary">
          За цими фільтрами вправ не знайдено.
        </p>
      )}
      {result.totalPages > 1 ? (
        <nav className="flex justify-center gap-2" aria-label="Сторінки">
          {Array.from({ length: result.totalPages }, (_, index) => index + 1).map((page) => (
            <a
              key={page}
              className="rc-btn rc-btn-secondary"
              href={`?${new URLSearchParams({ ...filters, page: String(page) })}`}
            >
              {page}
            </a>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
