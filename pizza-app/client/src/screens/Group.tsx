import { useEffect, useState } from 'react';

import { splitBill, summarize } from '@shared/pricing';
import type { GroupDto } from '@shared/types';
import { LineView } from '../components/Cards';
import Icon from '../components/Icon';
import { Avatar, Money, Spinner, Stepper } from '../components/ui';
import { api } from '../lib/api';
import { formatMoney } from '../lib/format';
import { useNav } from '../lib/nav';
import { errorText } from '../lib/i18n';
import { useStore } from '../lib/store';
import { confirmDialog, ensureWriteAccess, hapticNotify, openTelegramLink, shareMessage } from '../lib/telegram';

function useCountdown(until: number): string {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const left = Math.max(0, until - now);
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  return `${h}:${String(m).padStart(2, '0')}`;
}

function TableArt() {
  return (
    <svg viewBox="0 0 240 150" className="group-art" aria-hidden="true">
      <ellipse cx="120" cy="84" rx="92" ry="40" fill="currentColor" opacity=".08" />
      <ellipse cx="120" cy="80" rx="80" ry="32" fill="#e7b57d" />
      <ellipse cx="120" cy="76" rx="80" ry="32" fill="#f0c38e" />
      <circle cx="120" cy="76" r="26" fill="#e4a354" />
      <circle cx="120" cy="76" r="21" fill="#fce8b9" />
      <circle cx="112" cy="70" r="4" fill="#b8291b" />
      <circle cx="127" cy="72" r="4" fill="#b8291b" />
      <circle cx="119" cy="84" r="4" fill="#b8291b" />
      {(
        [
          [40, 40, '#ff6b3d'],
          [200, 40, '#3fb27f'],
          [26, 104, '#4a90e2'],
          [214, 104, '#f5a623'],
          [120, 134, '#9b59b6'],
        ] as [number, number, string][]
      ).map(([x, y, color], i) => (
        <g key={i} className="group-art__seat" style={{ animationDelay: `${i * 0.18}s` }}>
          <circle cx={x} cy={y} r="15" fill={color} />
          <circle cx={x} cy={y - 3} r="5" fill="#fff" opacity=".9" />
          <path d={`M${x - 8} ${y + 9}c2-6 14-6 16 0`} fill="#fff" opacity=".9" />
        </g>
      ))}
    </svg>
  );
}

function Intro({ note }: { note?: string }) {
  const { t, actions } = useStore();
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const { group } = await api.createGroup();
      actions.setGroup(group);
      hapticNotify('success');
    } catch (error) {
      actions.showError(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen group">
      <h1 className="screen__title">{t('group.title')}</h1>
      {note && <p className="note">{note}</p>}
      <section className="group-intro card">
        <TableArt />
        <h2>{t('group.introTitle')}</h2>
        <p>{t('group.introText')}</p>
        <ol className="group-steps">
          {([1, 2, 3, 4] as const).map((n) => (
            <li key={n}>
              <span>{n}</span>
              {t(`group.step${n}`)}
            </li>
          ))}
        </ol>
      </section>
      <div className="action-bar action-bar--tab">
        <button type="button" className="btn btn--flame btn--grow" onClick={create} disabled={busy}>
          {busy ? <Spinner size={20} /> : <Icon name="users" size={20} />}
          <span>{t('group.create')}</span>
        </button>
      </div>
    </div>
  );
}

function Invite({ code }: { code: string }) {
  const { state, t, actions } = useStore();
  const [group, setGroup] = useState<GroupDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .group(code)
      .then((result) => setGroup(result.group))
      .catch((err) => setError(err.code || 'group_not_found'));
  }, [code]);

  async function join() {
    setBusy(true);
    try {
      const result = await api.joinGroup(code);
      actions.setGroup(result.group);
      actions.clearLaunch();
      hapticNotify('success');
      ensureWriteAccess();
    } catch (err) {
      actions.showError(err);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <Intro note={errorText(state.lang, error)} />;
  if (!group) {
    return (
      <div className="screen group center pad">
        <Spinner size={32} />
      </div>
    );
  }
  if (group.status !== 'open') return <Intro note={t(group.status === 'expired' ? 'group.expired' : 'group.closed')} />;

  const host = group.members.find((member) => member.isHost);

  return (
    <div className="screen group">
      <section className="group-intro card">
        <TableArt />
        <h2>{t('group.inviteTitle')}</h2>
        <p>{t('group.inviteText', { name: host?.name || '' })}</p>
        <div className="avatars avatars--center">
          {group.members.map((member) => (
            <Avatar key={member.id} name={member.name} id={member.id} size={38} />
          ))}
        </div>
        <div className="group-code">{group.code}</div>
      </section>
      <div className="action-bar action-bar--tab">
        <button type="button" className="btn btn--flame btn--grow" onClick={join} disabled={busy}>
          {busy ? <Spinner size={20} /> : <Icon name="users" size={20} />}
          <span>{t('group.join')}</span>
        </button>
      </div>
    </div>
  );
}

export default function Group() {
  const { state, t, actions } = useStore();
  const group = state.group;
  const launchCode = state.launch?.type === 'group' ? state.launch.code : null;
  const alreadyIn = Boolean(launchCode && group?.code === launchCode && group.isMember);

  // Taklif havolasi orqali kelgan, lekin allaqachon shu davrada bo'lsa — taklifni unutamiz
  useEffect(() => {
    if (alreadyIn) actions.clearLaunch();
  }, [alreadyIn, actions]);

  if (launchCode && !alreadyIn) return <Invite code={launchCode} />;
  if (!group || !group.isMember) return <Intro />;
  if (group.status === 'closed' || group.status === 'expired') {
    return <Intro note={t(group.status === 'expired' ? 'group.expired' : 'group.closed')} />;
  }
  return <ActiveGroup group={group} />;
}

/** Foydalanuvchi a'zo bo'lgan ochiq (yoki buyurtma berilgan) davra */
function ActiveGroup({ group }: { group: GroupDto }) {
  const { state, t, actions } = useStore();
  const nav = useNav();
  const lang = state.lang;
  const countdown = useCountdown(group.expiresAt);
  const [busy, setBusy] = useState(false);

  const me = state.user?.id;
  const open = group.status === 'open';
  const lines = group.members.flatMap((member) => member.items.map(({ config, qty }) => ({ config, qty })));
  const summary = summarize(lines, { mode: state.mode });
  const shares = splitBill(group.members, { deliveryFee: summary.deliveryFee, hostId: group.hostId });

  async function share() {
    try {
      const { preparedId, link, text } = await api.shareGroup(group.code);
      if (preparedId && (await shareMessage(preparedId))) return;
      if (link) {
        openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
        return;
      }
      await navigator.clipboard?.writeText(group.code);
      actions.toast(t('group.linkCopied'));
    } catch (error) {
      actions.showError(error);
    }
  }

  async function changeQty(itemId: number, qty: number) {
    try {
      const result = await api.updateGroupItem(group.code, itemId, qty);
      actions.setGroup(result.group);
    } catch (error) {
      actions.showError(error);
    }
  }

  async function leave() {
    const message = group.isHost ? t('group.closeConfirm') : t('group.leaveConfirm');
    if (!(await confirmDialog(message))) return;
    setBusy(true);
    try {
      await api.leaveGroup(group.code);
      actions.setGroup(null);
    } catch (error) {
      actions.showError(error);
    } finally {
      setBusy(false);
    }
  }

  async function startNew() {
    try {
      const result = await api.createGroup();
      actions.setGroup(result.group);
    } catch (error) {
      actions.showError(error);
    }
  }

  return (
    <div className="screen group">
      <section className="group-head">
        <div className="group-head__glow" aria-hidden="true" />
        <div className="group-head__top">
          <div>
            <span className="group-head__label">{t('group.title')}</span>
            <div className="group-code">{group.code}</div>
          </div>
          {open && (
            <span className="group-head__timer">
              <Icon name="clock" size={15} /> {t('group.expires', { time: countdown })}
            </span>
          )}
        </div>
        <div className="avatars">
          {group.members.map((member) => (
            <Avatar key={member.id} name={member.name} id={member.id} size={34} />
          ))}
          <span className="avatars__count">{t('group.members', { n: group.members.length })}</span>
        </div>
        {open && !group.isHost && <p className="group-head__note">{t('group.waitHost')}</p>}
        {open && (
          <button type="button" className="btn btn--light btn--grow" onClick={share}>
            <Icon name="share" size={18} /> {t('group.share')}
          </button>
        )}
      </section>

      {group.status === 'ordered' && (
        <button
          type="button"
          className="banner banner--order"
          onClick={() => group.orderId != null && nav.push('tracker', { id: group.orderId })}
        >
          <span className="banner__pulse" />
          <span className="banner__text">
            <b>{t('group.ordered', { id: group.orderId ?? '' })}</b>
            <span>{t('group.track')}</span>
          </span>
          <Icon name="chevron" size={18} />
        </button>
      )}

      {group.members.map((member) => {
        const editable = open && (member.id === me || group.isHost);
        return (
          <section key={member.id} className={`card member ${member.id === me ? 'is-me' : ''}`}>
            <div className="member__head">
              <Avatar name={member.name} id={member.id} size={34} />
              <div className="member__name">
                <b>{member.id === me ? t('group.you') : member.name}</b>
                {member.isHost && <span className="tag tag--host">{t('group.host')}</span>}
              </div>
              <span className="member__sum">{formatMoney(member.subtotal, lang)}</span>
            </div>
            {member.items.length === 0 ? (
              <p className="member__empty">{t('group.choosing')}</p>
            ) : (
              member.items.map((item) => (
                <LineView key={item.id} config={item.config} qty={item.qty} unit={item.unit} lang={lang}>
                  {editable ? (
                    <Stepper size="sm" value={item.qty} onChange={(qty) => changeQty(item.id, qty)} />
                  ) : (
                    <span className="muted">×{item.qty}</span>
                  )}
                </LineView>
              ))
            )}
          </section>
        );
      })}

      {shares.length > 1 && (
        <section className="card">
          <div className="form__label">{t('group.split')}</div>
          {shares.map((entry) => (
            <div key={entry.id} className="split-row">
              <Avatar name={entry.name} id={entry.id} size={30} />
              <span className="split-row__name">{entry.id === me ? t('group.you') : entry.name}</span>
              <b>{formatMoney(entry.amount, lang)}</b>
            </div>
          ))}
          {state.mode === 'delivery' && <p className="muted small">{t('group.splitNote')}</p>}
        </section>
      )}

      {open ? (
        <button type="button" className="link-btn link-btn--danger center-block" onClick={leave} disabled={busy}>
          {group.isHost ? t('group.close') : t('group.leave')}
        </button>
      ) : (
        <button type="button" className="link-btn center-block" onClick={startNew}>
          <Icon name="plus" size={16} /> {t('group.newDavra')}
        </button>
      )}

      {open && (
        <div className="action-bar action-bar--tab">
          {group.isHost ? (
            <button
              type="button"
              className="btn btn--flame btn--grow btn--split"
              disabled={group.itemsCount === 0}
              onClick={() => nav.push('checkout', { group: true })}
            >
              <span>{t('group.checkout')}</span>
              <Money value={summary.total} />
            </button>
          ) : (
            <button type="button" className="btn btn--flame btn--grow" onClick={() => nav.setTab('menu')}>
              <Icon name="plus" size={18} /> {t('group.addMine')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
