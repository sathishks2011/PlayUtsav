import { ChangeEvent } from 'react';
import { FormattedMessage } from 'react-intl';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { localeOptions, setLocale } from '../store/slices/localeSlice';

export function LocaleSwitcher() {
  const dispatch = useAppDispatch();
  const current = useAppSelector((s) => s.locale.current);

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    dispatch(setLocale(event.target.value));
  };

  return (
    <label className="text-sm flex items-center gap-2">
      <span className="uppercase tracking-[0.2em] text-xs opacity-60">
        <FormattedMessage id="localeSwitcher.label" defaultMessage="Language" />
      </span>
      <select
        value={current}
        onChange={handleChange}
        className="bg-black/30 border border-white/20 rounded px-3 py-1 text-sm"
      >
        {localeOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
