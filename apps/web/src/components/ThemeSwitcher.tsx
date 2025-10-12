import { ChangeEvent } from 'react';
import { setTheme, themeOptions } from '../store/slices/themeSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { FormattedMessage } from 'react-intl';

export function ThemeSwitcher() {
  const dispatch = useAppDispatch();
  const current = useAppSelector((s) => s.theme.current);

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    dispatch(setTheme(event.target.value));
  };

  return (
    <label className="text-sm flex items-center gap-2">
      <span className="uppercase tracking-[0.2em] text-xs opacity-60">
        <FormattedMessage id="themeSwitcher.label" defaultMessage="Theme" />
      </span>
      <select
        value={current}
        onChange={handleChange}
        className="bg-black/30 border border-white/20 rounded px-3 py-1 text-sm"
      >
        {themeOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
