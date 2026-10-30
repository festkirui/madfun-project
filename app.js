import    {    createClient    }    from    '@supabase/supabase-js';

const    url    =    import.meta.env.VITE_SUPABASE_URL;
const    publicKey    =    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const    db    =    url    &&    publicKey    ?    createClient(url,    publicKey)    :    null;
const    seed    =    [
        {    id:    '1',    name:    'Sunset    Sessions:    Rooftop    Edition',    category:    'Music',    date:    '2026-10-30',    time:    '18:00',    venue:    'The    Social    House,    Westlands',    price:    2500,    tag:    'LIVE    MUSIC',    art:    1,    status:    'On    sale',    sold:    128,    capacity:    200    },
        {    id:    '2',    name:    'Nairobi    Design    Weekender',    category:    'Arts    &    culture',    date:    '2026-11-01',    time:    '10:00',    venue:    'KICC,    CBD',    price:    4000,    tag:    'ARTS    &    CULTURE',    art:    2,    status:    'On    sale',    sold:    91,    capacity:    150    },
        {    id:    '3',    name:    'Sunday    Table:    Farm    to    Fork',    category:    'Food    &    drink',    date:    '2026-11-02',    time:    '12:30',    venue:    'Cultiva,    Karen',    price:    3500,    tag:    'FOOD    &    DRINK',    art:    3,    status:    'On    sale',    sold:    74,    capacity:    100    },
        {    id:    '4',    name:    'Soft    Life:    A    Slow    Sunday    Reset',    category:    'Wellness',    date:    '2026-11-08',    time:    '09:00',    venue:    'Karura    Forest,    Gate    A',    price:    1800,    tag:    'WELLNESS',    art:    4,    status:    'On    sale',    sold:    0,    capacity:    80    },
        {    id:    '5',    name:    'The    Listening    Room',    category:    'Music',    date:    '2026-11-12',    time:    '19:00',    venue:    'Ngong    Racecourse,    Nairobi',    price:    3000,    tag:    'LIVE    MUSIC',    art:    5,    status:    'On    sale',    sold:    46,    capacity:    120    },
        {    id:    '6',    name:    'Clay,    Coffee    &    Conversation',    category:    'Workshops',    date:    '2026-11-14',    time:    '11:00',    venue:    'Matteo’s,    Lavington',    price:    2200,    tag:    'WORKSHOP',    art:    6,    status:    'On    sale',    sold:    33,    capacity:    60    },
];
const    read    =    (key,    fallback)    =>    {    try    {    return    JSON.parse(localStorage.getItem(key))    ??    fallback;    }    catch    {    return    fallback;    }    };
let    events    =    db    ?    []    :    read('gather-events',    seed);
let    saved    =    read('gather-saved',    []);
let    tickets    =    db    ?    []    :    read('gather-tickets',    []);
let    user    =    null,    category    =    'All',    quantity    =    1,    ticketType    =    'general',    paymentMethod    =    'mpesa',    current    =    null,    lastReceipt    =    null,    organizerOrders    =    [],    adminOrders    =    [],    adminEventRows    =    [],    adminFilter    =    'all',    adminTab    =    'bookings';
const    $    =    s    =>    document.querySelector(s),    $$    =    s    =>    [...document.querySelectorAll(s)];
const    esc    =    s    =>    String(s    ??    '').replace(/[&<>"']/g,    c    =>    ({    '&':    '&amp;',    '<':    '&lt;',    '>':    '&gt;',    '"':    '&quot;',    "'":    '&#39;'    }[c]));
const    persist    =    ()    =>    {    if    (!db)    {    localStorage.setItem('gather-events',    JSON.stringify(events));    localStorage.setItem('gather-saved',    JSON.stringify(saved));    localStorage.setItem('gather-tickets',    JSON.stringify(tickets));    }    };
const    formatDate    =    s    =>    new    Intl.DateTimeFormat('en-KE',    {    weekday:    'short',    month:    'short',    day:    'numeric'    }).format(new    Date(`${s}T12:00:00`));
const    kes    =    n    =>    Number(n)    ===    0    ?    'Free'    :    `KSh    ${Number(n    ||    0).toLocaleString('en-KE')}`;
const    fromRow    =    e    =>    ({    id:    e.id,    organizer_id:    e.organizer_id,    name:    e.name,    category:    e.category,    date:    e.date,    time:    String(e.time).slice(0,    5),    venue:    e.venue,    price:    e.price_kes,    generalPrice:    e.general_price_kes    ??    e.price_kes,    vipPrice:    e.vip_price_kes,    vvipPrice:    e.vvip_price_kes,    hasTiers:    e.vip_price_kes    !=    null    &&    e.vvip_price_kes    !=    null,    manualPaymentRequired:    e.manual_payment_required,    tag:    e.category.toUpperCase(),    art:    e.art,    status:    e.status    ===    'published'    ?    'On    sale'    :    e.status    ===    'coming_soon'    ?    'Coming    soon'    :    'Draft',    sold:    0,    capacity:    e.capacity,    description:    e.description,    ticketUrl:    e.ticket_url,    salesOpenAt:    e.sales_open_at    });
function    toast(message)    {    const    t    =    $('#toast');    t.textContent    =    message;    t.classList.add('show');    setTimeout(()    =>    t.classList.remove('show'),    2800);    }
function    card(e)    {    const    isSaved    =    saved.map(String).includes(String(e.id));    const    coming    =    e.status    ===    'Coming    soon';    const    label    =    e.art    ===    7    ?    'BAYERN    ×    AJAX'    :    ['GOLDEN','AFTER','TABLE','SLOW','SOUND','MAKE'][((e.art    ||    1)    -    1)    %    6];    const    price    =    e.hasTiers    ?    `From    ${kes(e.generalPrice)}`    :    kes(e.price);    return    `<article    class="event"><div    class="art    art-${e.art    ||    1}"><span>${label}</span><button    class="heart    ${isSaved    ?    'saved'    :    ''}"    data-save="${esc(e.id)}"    aria-label="${isSaved    ?    'Remove    from    saved'    :    'Save    event'}">${isSaved    ?    '♥'    :    '♡'}</button></div><div    class="eventbody"><small    class="eventtype">${esc(e.tag    ||    e.category.toUpperCase())}${coming    ?    '    ·    COMING    SOON'    :    ''}</small><h3    class="eventtitle">${esc(e.name)}</h3><div    class="eventline">◷    &nbsp;${formatDate(e.date)}    ·    ${coming    ?    'Time    TBA'    :    esc(e.time)}</div><div    class="eventline">⌖    &nbsp;${esc(e.venue)}</div><div    class="eventfoot"><b>${coming    ?    'Prices    TBA'    :    price}</b><span    data-buy="${esc(e.id)}">${coming    ?    'Event    details    ↗'    :    'Book    tickets    ↗'}</span></div></div></article>`;    }
function    render()    {
        syncAdminNav();
        const    q    =    ($('#search')?.value    ||    '').toLowerCase();
        const    visible    =    events.filter(e    =>    (category    ===    'All'    ||    e.category    ===    category)    &&    (!q    ||    `${e.name}    ${e.venue}    ${e.category}`.toLowerCase().includes(q)));
        $('#events').innerHTML    =    visible.map(card).join('');    $('#empty').classList.toggle('hide',    visible.length    >    0);
        $('#savedCount').textContent    =    saved.length;    $('#savedEvents').innerHTML    =    events.filter(e    =>    saved.map(String).includes(String(e.id))).map(card).join('');    $('#savedEmpty').classList.toggle('hide',    saved.length    >    0);
        const    owned    =    db    &&    user    ?    events.filter(e    =>    e.organizer_id    ===    user.id)    :    events;
        $('#adminEvents').innerHTML    =    owned.slice(0,    5).map(e    =>    `<div    class="adminrow"><div    class="miniart    art-${e.art    ||    1}"></div><div><b>${esc(e.name)}</b><small>${formatDate(e.date)}    ·    ${e.sold    ||    0}    tickets    reserved</small></div>${e.status    ===    'Draft'    ?    `<button    class="status    draft"    data-publish="${esc(e.id)}">Publish</button>`    :    `<span    class="status">${esc(e.status    ||    'On    sale')}</span>`}</div>`).join('')    ||    '<div    class="empty">Create    your    first    event    to    see    it    here.</div>';
        $('#eventCount').textContent    =    owned.length;
        if    (db)    {
                $('#sales').textContent    =    organizerOrders.reduce((a,    o)    =>    a    +    Number(o.amount_kes),    0).toLocaleString('en-KE');
                $('#sold').textContent    =    organizerOrders.reduce((a,    o)    =>    a    +    Number(o.quantity),    0);
                $('#publishedCount').textContent    =    owned.filter(e    =>    e.status    ===    'On    sale').length;
                const    host    =    $('#recentActivity');
                host.innerHTML    =    organizerOrders.slice(0,    4).map(o    =>    {
                        const    event    =    events.find(item    =>    String(item.id)    ===    String(o.event_id));
                        const    when    =    new    Date(o.created_at).toLocaleString('en-KE',    {    dateStyle:    'medium',    timeStyle:    'short'    });
                        return    `<div    class="activity"><span    class="a2">GT</span><div><b>Guest    reservation</b><p>${esc(event?.name    ||    'Gather    event')}</p><small>${when}</small></div><strong>+    ${kes(o.amount_kes)}</strong></div>`;
                }).join('')    ||    '<div    class="empty">No    reservations    yet.    They    will    appear    here.</div>';
        }
$('#myTickets').innerHTML    =    tickets.map(t    =>    {    const    pay    =    t.payment    ||    {};    const    state    =    pay.status    ===    'verified'    ?    'PAYMENT    VERIFIED'    :    pay.status    ===    'rejected'    ?    'PAYMENT    NEEDS    REVIEW'    :    pay.id    ?    'PAYMENT    PENDING    VERIFICATION'    :    'RESERVATION';    return    `<article    class="ticket"><small    class="eyebrow">—    ${state}</small><b>${esc(t.name)}</b><p>${formatDate(t.date)}    ·    ${esc(t.venue)}</p><p>${t.quantity}    ×    ${(t.ticketType    ||    'general').toUpperCase()}    ·    ${kes(t.amount    ??    t.price    *    t.quantity)}　　#GT-${String(t.id).slice(-5)}</p>${pay.id    ?    `<p>${pay.payment_method    ===    'binance_pay'    ?    'Binance    Pay    reference'    :    'M-Pesa    code'}:    ${esc(pay.transaction_code)}</p>${pay.crypto_asset    ?    `<p>Crypto    reported:    ${esc(pay.crypto_amount)}    ${esc(pay.crypto_asset)}</p>`    :    ''}<p>Payment    is    not    automatically    verified.    This    is    not    an    entry    ticket.</p><button    class="text"    data-download-receipt="${esc(t.id)}">Download    receipt    ↓</button>`    :    '<p>Reservation    only.    Payment    has    not    been    collected.</p>'}</article>`;    }).join('');
        $('#ticketsEmpty').classList.toggle('hide',    tickets.length    >    0);
        $('#organizerName').textContent    =    user?.email?.split('@')[0]    ||    'Jamie';
        if    (db)    {    $('#connectionStatus').textContent    =    user    ?    'Connected    ·    signed    in'    :    'Connected    ·    sign    in';    $('#authButton').textContent    =    user    ?    (user.email?.split('@')[0]    ||    'Account')    :    'Sign    in';    }


}
async    function    refreshData()    {
        if    (!db)    {    render();    return;    }
        $('#connectionStatus').textContent    =    'Connecting…';
        const    {    data,    error    }    =    await    db.from('gather_events').select('id,organizer_id,name,category,date,time,venue,price_kes,general_price_kes,vip_price_kes,vvip_price_kes,manual_payment_required,capacity,status,art,description,ticket_url,sales_open_at').order('date');
        if    (error)    {    $('#connectionStatus').textContent    =    'Connection    issue';    toast(`Could    not    load    events:    ${error.message}`);    render();    return;    }
        events    =    (data    ||    []).map(fromRow);
        tickets    =    [];    organizerOrders    =    [];
        if    (user)    {
                const    {    data:    orders,    error:    orderError    }    =    await    db.from('gather_orders').select('id,event_id,quantity,ticket_type,payment_status,amount_kes,status,created_at,gather_events(name,date,time,venue,price_kes),gather_payment_submissions(id,transaction_code,payer_phone,payee_phone,payee_binance_id,payment_method,crypto_asset,crypto_amount,status,created_at)').eq('buyer_id',    user.id).order('created_at',    {    ascending:    false    });
                if    (!orderError)    tickets    =    (orders    ||    []).map(o    =>    {    const    e    =    Array.isArray(o.gather_events)    ?    o.gather_events[0]    :    o.gather_events;    return    {    id:    o.id,    name:    e?.name    ||    'Event',    date:    e?.date    ||    '2026-10-30',    venue:    e?.venue    ||    'Nairobi',    price:    e?.price_kes    ||    0,    ticketType:    o.ticket_type,    quantity:    o.quantity,    amount:    o.amount_kes,    status:    o.status,    paymentStatus:    o.payment_status,    payment:    Array.isArray(o.gather_payment_submissions)    ?    o.gather_payment_submissions[0]    :    o.gather_payment_submissions    };    });
                const    ids    =    events.filter(e    =>    e.organizer_id    ===    user.id).map(e    =>    e.id);
                if    (ids.length)    {    const    result    =    await    db.from('gather_orders').select('event_id,quantity,amount_kes,created_at').in('event_id',    ids);    if    (!result.error)    organizerOrders    =    result.data    ||    [];    }
        }
        render();    if    (isGatherAdmin())    await    refreshAdminData();
}
function    isGatherAdmin()    {    return    user?.app_metadata?.gather_admin    ===    true    ||    user?.app_metadata?.gather_admin    ===    'true';    }
function    syncAdminNav()    {    $('#adminNav').classList.toggle('hide',    !isGatherAdmin());    }
function    finishAdminLogin()    {    if    (sessionStorage.getItem('gather-admin-login')    !==    '1')    return;    sessionStorage.removeItem('gather-admin-login');    $('#authDialog').classList.add('hide');    if    (isGatherAdmin())    {    showPage('admin');    toast('Admin    access    granted.');    }    else    {    showPage('discover');    toast('This    account    does    not    have    admin    access.');    }    }
async    function    refreshAdminData()    {
        if    (!db    ||    !isGatherAdmin())    {    adminOrders    =    [];    adminEventRows    =    [];    renderAdmin();    return;    }
        const    [ordersResult,    eventsResult]    =    await    Promise.all([
                db.from('gather_orders').select('id,event_id,buyer_id,buyer_name,buyer_phone,buyer_email,quantity,ticket_type,amount_kes,payment_status,status,created_at,gather_events(id,name,date,venue,status),gather_payment_submissions(id,payment_method,transaction_code,payer_phone,payee_binance_id,crypto_asset,crypto_amount,status,created_at,review_note)').order('created_at',    {    ascending:    false    }),
                db.from('gather_events').select('id,name,category,date,time,venue,price_kes,general_price_kes,vip_price_kes,vvip_price_kes,capacity,status,manual_payment_required').order('date')
        ]);
        if    (ordersResult.error    ||    eventsResult.error)    {    toast(`Admin    data    could    not    load:    ${ordersResult.error?.message    ||    eventsResult.error?.message}`);    return;    }
        adminOrders    =    ordersResult.data    ||    [];    adminEventRows    =    eventsResult.data    ||    [];    renderAdmin();
}
function    renderAdmin()    {
        if    (!isGatherAdmin())    return;
        const    getPayment    =    row    =>    Array.isArray(row.gather_payment_submissions)    ?    row.gather_payment_submissions[0]    :    row.gather_payment_submissions;
        const    pending    =    adminOrders.filter(row    =>    getPayment(row)?.status    ===    'pending_verification');
        const    verified    =    adminOrders.filter(row    =>    getPayment(row)?.status    ===    'verified');
        $('#adminBookingTotal').textContent    =    adminOrders.length.toLocaleString('en-KE');
        $('#adminPendingTotal').textContent    =    pending.length.toLocaleString('en-KE');
        $('#adminPaidTotal').textContent    =    kes(verified.reduce((sum,    row)    =>    sum    +    Number(row.amount_kes    ||    0),    0));
        $('#adminEventTotal').textContent    =    adminEventRows.filter(row    =>    row.status    ===    'published').length.toLocaleString('en-KE');
        $('#adminBookingCount').textContent    =    adminOrders.length;    $('#adminPendingCount').textContent    =    pending.length;    $('#adminEventCount').textContent    =    adminEventRows.length;
        const    query    =    ($('#adminSearch').value    ||    '').trim().toLowerCase();
        const    visible    =    adminOrders.filter(row    =>    {
                const    payment    =    getPayment(row);    const    status    =    payment?.status    ||    row.payment_status    ||    'unpaid';
                const    event    =    Array.isArray(row.gather_events)    ?    row.gather_events[0]    :    row.gather_events;
                const    matchesFilter    =    adminFilter    ===    'all'    ||    status    ===    adminFilter;
                const    terms    =    `${row.id}    ${row.buyer_id}    ${event?.name    ||    ''}    ${payment?.transaction_code    ||    ''}    ${payment?.payer_phone    ||    ''}    ${payment?.crypto_asset    ||    ''}`.toLowerCase();
                return    matchesFilter    &&    (!query    ||    terms.includes(query));
        });
        $('#adminBookingsRows').innerHTML    =    visible.map(row    =>    {
                const    payment    =    getPayment(row);    const    event    =    Array.isArray(row.gather_events)    ?    row.gather_events[0]    :    row.gather_events;
                const    status    =    payment?.status    ||    row.payment_status    ||    'unpaid';    const    label    =    status    ===    'pending_verification'    ?    'Pending    review'    :    status    ===    'verified'    ?    'Verified'    :    status    ===    'rejected'    ?    'Rejected'    :    'Unpaid';
                const    method    =    payment?.payment_method    ===    'binance_pay'    ?    'Binance    Pay'    :    payment?.payment_method    ===    'mpesa'    ?    'M-Pesa'    :    '—';
                const    paymentRef    =    payment?.transaction_code    ||    '—';
                const    action    =    status    ===    'pending_verification'    &&    payment?.id    ?    `<div    class="admin-actions"><button    class="review-approve"    data-review-payment="${esc(payment.id)}"    data-decision="verified">Verify</button><button    class="review-reject"    data-review-payment="${esc(payment.id)}"    data-decision="rejected">Reject</button></div>`    :    '<span    class="muted">—</span>';
                return    `<tr><td><b>GT-${String(row.id).slice(-6).toUpperCase()}</b><small>${new    Date(row.created_at).toLocaleDateString('en-KE')}</small></td><td><b>${esc(event?.name    ||    'Gather    event')}</b><small>${event?.date    ?    formatDate(event.date)    :    'Date    TBA'}</small></td><td><b>${esc(row.buyer_name    ||    (row.buyer_id    ?    'Account    booking'    :    'Guest    checkout'))}</b><small>${esc(row.buyer_phone    ||    String(row.buyer_id    ||    '').slice(0,    8))}</small></td><td>${esc(String(row.ticket_type    ||    'general').toUpperCase())}<small>${row.quantity}    ticket${row.quantity    ===    1    ?    ''    :    's'}</small></td><td><b>${kes(row.amount_kes)}</b></td><td>${method}<small>${esc(paymentRef)}</small></td><td><span    class="admin-status    status-${status}">${label}</span></td><td>${action}</td></tr>`;
        }).join('');
        $('#adminBookingsEmpty').classList.toggle('hide',    visible.length    >    0);
        $('#adminEventRows').innerHTML    =    adminEventRows.map(event    =>    {
                const    price    =    event.general_price_kes    ??    event.price_kes;
                const    next    =    event.status    ===    'published'    ?    'draft'    :    'published';
                const    action    =    `<button    class="event-toggle    ${event.status    ===    'published'    ?    'pause'    :    'activate'}"    data-event-status="${esc(event.id)}"    data-next-status="${next}">${event.status    ===    'published'    ?    'Unpublish'    :    'Publish'}</button>`;
                return    `<tr><td><b>${esc(event.name)}</b><small>${esc(event.category)}</small></td><td>${formatDate(event.date)}</td><td>${esc(event.venue)}</td><td>${kes(price)}</td><td><span    class="admin-status    status-${esc(event.status)}">${esc(event.status.replace('_','    '))}</span></td><td>${action}</td></tr>`;
        }).join('');
        $('#adminEventsEmpty').classList.toggle('hide',    adminEventRows.length    >    0);
}
function    showPage(id)    {
        if    (id    ===    'admin'    &&    !isGatherAdmin())    {    toast('Admin    access    is    required.');    return;    }
        if    (id    ===    'studio'    &&    db    &&    !user)    {    $('#authDialog').classList.remove('hide');    toast('Sign    in    to    open    Organizer    Studio.');    return;    }
        $$('.page').forEach(p    =>    p.classList.toggle('hide',    p.id    !==    id));    $$('.nav').forEach(n    =>    n.classList.toggle('active',    n.dataset.page    ===    id));
        $('#crumb').textContent    =    ({    discover:    'Discover',    studio:    'Organizer    studio',    saved:    'Saved    events',    tickets:    'My    tickets',    admin:    'Admin    console'    })[id];
}
function    openAuth()    {    if    (sessionStorage.getItem('gather-admin-login')    !==    '1')    {    $('#authEyebrow').textContent    =    '—    YOUR    GATHER    ACCOUNT';    $('#authHeading').textContent    =    'Good    things    start    together.';    $('#authDescription').textContent    =    'Sign    in    with    your    email    to    create    events    and    keep    your    tickets    safe.';    }    $('#authDialog').classList.remove('hide');    }
function    downloadReceipt(r)    {
        const    safe    =    value    =>    String(value    ??    '').normalize('NFKD').replace(/[\u0300-\u036f]/g,    '').replace(/[^\x20-\x7E]/g,    '').replace(/[()\\]/g,    '\\$&');
        const    ref    =    String(r.order_id    ||    '').slice(-8).toUpperCase();
        const    rows    =    [
['Event',    r.event_name],    ['Booked    by',    r.buyer_name],    ['Contact    phone',    r.buyer_phone],    ['Email',    r.buyer_email],    ['Date',    r.event_date    ?    formatDate(r.event_date)    :    '5    January    2027'],    ['Venue',    r.venue    ||    'Raila    Odinga    International    Stadium,    Talanta    Sports    City,    Nairobi'],
                ['Ticket',    `${String(r.ticket_type    ||    'general').toUpperCase()}    x    ${r.quantity    ||    1}`],    ['Amount    submitted',    kes(r.amount_kes)],
['Payment    method',    r.payment_method    ===    'binance_pay'    ?    'Binance    Pay'    :    'M-Pesa'],    ['M-Pesa    sent    to',    r.payee_phone],    ['Binance    Pay    ID',    r.payee_binance_id],    ['Crypto    sent',    r.crypto_asset    ?    String(r.crypto_amount)    +    '    '    +    r.crypto_asset    :    ''],    ['Payer    phone',    r.payer_phone],    ['Transaction    reference',    r.transaction_code],
                ['Submitted',    r.created_at    ?    new    Date(r.created_at).toLocaleString('en-KE')    :    new    Date().toLocaleString('en-KE')],
                ['Status',    r.payment_status    ===    'verified'    ?    'PAYMENT    VERIFIED'    :    'PENDING    MANUAL    VERIFICATION']
        ];
        let    y    =    770;    const    ops    =    ['BT    /F1    20    Tf    52    786    Td    (Gather    booking    receipt)    Tj    ET',    `BT    /F1    10    Tf    52    758    Td    (Reservation    reference:    GT-${safe(ref)})    Tj    ET`,    '0.8    w    52    744    m    543    744    l    S'];
        for    (const    [label,    value]    of    rows)    {    ops.push(`BT    /F2    10    Tf    52    ${y}    Td    (${safe(label)})    Tj    ET`);    ops.push(`BT    /F1    10    Tf    220    ${y}    Td    (${safe(value)})    Tj    ET`);    y    -=    27;    }
        y    -=    6;
        const    notes    =    ['This    receipt    confirms    the    booking    and    M-Pesa    details    were    submitted.',    'Payment    has    not    been    automatically    verified;    this    is    not    proof    of    cleared    funds.',    'This    document    is    not    a    ticket    and    does    not    grant    entry    to    the    event.'];
        ops.push(`BT    /F2    9    Tf    52    ${y}    Td    (Important)    Tj    ET`);    y    -=    18;
        for    (const    note    of    notes)    {    ops.push(`BT    /F1    8    Tf    52    ${y}    Td    (${safe(note)})    Tj    ET`);    y    -=    15;    }
        const    stream    =    ops.join('\n');
        const    objects    =    [
                '<<    /Type    /Catalog    /Pages    2    0    R    >>',
                '<<    /Type    /Pages    /Kids    [3    0    R]    /Count    1    >>',
                '<<    /Type    /Page    /Parent    2    0    R    /MediaBox    [0    0    595    842]    /Resources    <<    /Font    <<    /F1    4    0    R    /F2    5    0    R    >>    >>    /Contents    6    0    R    >>',
                '<<    /Type    /Font    /Subtype    /Type1    /BaseFont    /Helvetica    >>',
                '<<    /Type    /Font    /Subtype    /Type1    /BaseFont    /Helvetica-Bold    >>',
                `<<    /Length    ${new    TextEncoder().encode(stream).length}    >>\nstream\n${stream}\nendstream`
        ];
        let    pdf    =    '%PDF-1.4\n';    const    offsets    =    [0];
        objects.forEach((object,    index)    =>    {    offsets.push(new    TextEncoder().encode(pdf).length);    pdf    +=    `${index    +    1}    0    obj\n${object}\nendobj\n`;    });
        const    xref    =    new    TextEncoder().encode(pdf).length;    pdf    +=    `xref\n0    ${objects.length    +    1}\n0000000000    65535    f    \n`;
        for    (let    i    =    1;    i    <    offsets.length;    i++)    pdf    +=    `${String(offsets[i]).padStart(10,    '0')}    00000    n    \n`;
        pdf    +=    `trailer\n<<    /Size    ${objects.length    +    1}    /Root    1    0    R    >>\nstartxref\n${xref}\n%%EOF`;
        const    url    =    URL.createObjectURL(new    Blob([pdf],    {    type:    'application/pdf'    }));    const    link    =    document.createElement('a');    link.href    =    url;    link.download    =    `madfun-receipt-GT-${ref    ||    'booking'}.pdf`;    link.click();    setTimeout(()    =>    URL.revokeObjectURL(url),    1000);
}
function    openBuy(id)    {    current    =    events.find(e    =>    String(e.id)    ===    String(id));    if    (!current)    {    toast('This    event    is    no    longer    available.');    return;    }    quantity    =    1;    ticketType    =    'general';    const    coming    =    current.status    ===    'Coming    soon';    $('#buyName').textContent    =    current.name;    $('#quantityNote').textContent    =    current.hasTiers    ?    'Choose    quantity'    :    `${kes(current.price)}    per    ticket`;    $('#buyInfo').textContent    =    `${formatDate(current.date)}    ·    ${coming    ?    'Kick-off    time    TBA'    :    current.time}    ·    ${current.venue}`;    $('#buyArt').className    =    `buyArt    art-${current.art    ||    1}`;    $('#ticketTypeWrap').classList.toggle('hide',    !current.hasTiers    ||    coming);    $('#ticketType').value    =    'general';    if    (current.hasTiers)    {    $('#ticketType').options[0].text    =    `General    Admission    ·    ${kes(current.generalPrice)}`;    $('#ticketType').options[1].text    =    `VIP    ·    ${kes(current.vipPrice)}`;    $('#ticketType').options[2].text    =    `VVIP    ·    ${kes(current.vvipPrice)}`;    }    $('#quantity').parentElement.classList.toggle('hide',    coming);    $('#total').parentElement.classList.toggle('hide',    coming);    $('#guestDetails').classList.toggle('hide',    !current.manualPaymentRequired    ||    coming);    $('#buyerName').value    =    '';    $('#buyerPhone').value    =    '';    $('#buyerEmail').value    =    '';    $('#paymentChoice').classList.toggle('hide',    !current.manualPaymentRequired    ||    coming);    $('#mpesaCode').value    =    '';    $('#cryptoAsset').value    =    '';    $('#cryptoAmount').value    =    '';    $('#binanceCode').value    =    '';    $('#checkout').classList.toggle('hide',    coming);    $('#checkout').textContent    =    current.manualPaymentRequired    ?    'Submit    booking    &    download    receipt    ↗'    :    (user    ?    'Reserve    tickets    ↗'    :    'Sign    in    to    book    tickets    ↗');    $('#buyDialog').querySelector('.secure').textContent    =    current.manualPaymentRequired    ?    'No    account    required.    Payment    remains    pending    manual    verification;    this    is    not    an    entry    ticket.'    :    'Reservation    only    ·    payment    not    collected    ·    not    an    entry    ticket';    $('#buyDialog').querySelector('.secure').classList.toggle('hide',    coming);    $('#officialTicketLink').classList.toggle('hide',    !coming);    $('#officialTicketLink').href    =    current.ticketUrl    ||    'https://talantasportscity.com/';    $('#officialTicketLink').textContent    =    `Official    ticket    information    ·    sales    expected    ${current.salesOpenAt    ?    formatDate(current.salesOpenAt)    :    'soon'}    ↗`;    updateTotal();    setPaymentMethod('mpesa');    if    (coming)    $('#buyPrice').textContent    =    'Ticket    prices    to    be    announced';    $('#buyDialog').classList.remove('hide');    }
function    setPaymentMethod(method)    {    paymentMethod    =    method;    $$('[data-payment]').forEach(button    =>    button.classList.toggle('on',    button.dataset.payment    ===    method));    const    active    =    current?.manualPaymentRequired    &&    current.status    !==    'Coming    soon';    $('#mpesaPanel').classList.toggle('hide',    !active    ||    method    !==    'mpesa');    $('#binancePanel').classList.toggle('hide',    !active    ||    method    !==    'binance_pay');    }
function    selectedPrice()    {    if    (!current)    return    0;    if    (ticketType    ===    'vip')    return    Number(current.vipPrice    ??    current.price);    if    (ticketType    ===    'vvip')    return    Number(current.vvipPrice    ??    current.price);    return    Number(current.generalPrice    ??    current.price);    }
function    updateTotal()    {    $('#quantity').textContent    =    quantity;    const    total    =    selectedPrice()    *    quantity;    $('#buyPrice').textContent    =    `${kes(selectedPrice())}    per    ticket`;    $('#total').textContent    =    kes(total);    $('#mpesaAmount').textContent    =    kes(total);    $('#binanceAmount').textContent    =    kes(total);    }

document.addEventListener('click',    async    e    =>    {
const    reviewButton    =    e.target.closest('[data-review-payment]');
        if    (reviewButton)    {    if    (!isGatherAdmin())    return;    const    decision    =    reviewButton.dataset.decision;    if    (decision    ===    'rejected'    &&    !window.confirm('Reject    this    payment    submission    and    release    its    booking    hold?'))    return;    reviewButton.disabled    =    true;    const    {    error    }    =    await    db.rpc('review_gather_payment',    {    p_payment_id:    reviewButton.dataset.reviewPayment,    p_decision:    decision,    p_note:    null    });    if    (error)    {    toast(error.message);    reviewButton.disabled    =    false;    return;    }    await    refreshData();    toast(decision    ===    'verified'    ?    'Payment    verified;    booking    marked    paid.'    :    'Payment    rejected;    booking    hold    released.');    return;    }
        const    eventStatus    =    e.target.closest('[data-event-status]');
        if    (eventStatus)    {    if    (!isGatherAdmin())    return;    const    {    error    }    =    await    db.from('gather_events').update({    status:    eventStatus.dataset.nextStatus    }).eq('id',    eventStatus.dataset.eventStatus);    if    (error)    {    toast(error.message);    return;    }    await    refreshData();    toast('Event    status    updated.');    return;    }
        const    publish    =    e.target.closest('[data-publish]');    if    (publish)    {    const    event    =    events.find(item    =>    String(item.id)    ===    String(publish.dataset.publish));    if    (!event)    return;    if    (db)    {    const    {    error    }    =    await    db.from('gather_events').update({    status:    'published'    }).eq('id',    event.id);    if    (error)    {    toast(error.message);    return;    }    }    else    {    event.status    =    'On    sale';    persist();    }    await    refreshData();    toast('Your    event    is    live    ✳');    return;    }
        const    nav    =    e.target.closest('[data-page]');    if    (nav)    {    showPage(nav.dataset.page);    return;    }
        const    buy    =    e.target.closest('[data-buy]');    if    (buy)    {    openBuy(buy.dataset.buy);    return;    }
        const    save    =    e.target.closest('[data-save]');    if    (save)    {    const    id    =    save.dataset.save;    saved    =    saved.map(String).includes(String(id))    ?    saved.filter(x    =>    String(x)    !==    String(id))    :    [...saved,    id];    persist();    render();    toast(saved.map(String).includes(String(id))    ?    'Saved    for    later    ♡'    :    'Removed    from    your    saved    events');    return;    }
        if    (e.target.matches('[data-close]'))    e.target.closest('.overlay').classList.add('hide');    if    (e.target.classList.contains('overlay'))    e.target.classList.add('hide');
});
$$('#paymentChoice    [data-payment]').forEach(button    =>    button.addEventListener('click',    ()    =>    setPaymentMethod(button.dataset.payment)));
$$('[data-admin-filter]').forEach(button    =>    button.addEventListener('click',    ()    =>    {    adminFilter    =    button.dataset.adminFilter;    $$('[data-admin-filter]').forEach(item    =>    item.classList.toggle('active',    item    ===    button));    renderAdmin();    }));
$$('[data-admin-tab]').forEach(button    =>    button.addEventListener('click',    ()    =>    {    adminTab    =    button.dataset.adminTab;    $$('[data-admin-tab]').forEach(item    =>    item.classList.toggle('selected',    item    ===    button));    $('#adminBookingsPanel').classList.toggle('hide',    adminTab    !==    'bookings');    $('#adminEventsPanel').classList.toggle('hide',    adminTab    !==    'events');    }));
$('#adminSearch').addEventListener('input',    renderAdmin);
$('#adminRefresh').addEventListener('click',    ()    =>    void    refreshAdminData());
$$('.chip').forEach(b    =>    b.addEventListener('click',    ()    =>    {    $$('.chip').forEach(c    =>    c.classList.remove('on'));    b.classList.add('on');    category    =    b.dataset.cat;    render();    }));

$('#search').addEventListener('input',    render);    $('#all').addEventListener('click',    ()    =>    {    $$('.chip').forEach(c    =>    c.classList.toggle('on',    c.dataset.cat    ===    'All'));    category    =    'All';    $('#search').value    =    '';    render();    });

$('#filters').addEventListener('click',    ()    =>    toast('Showing    events    in    Nairobi    ·    All    dates'));
$('#adminLoginButton').addEventListener('click',    ()    =>    {    if    (isGatherAdmin())    {    showPage('admin');    return;    }    sessionStorage.setItem('gather-admin-login','1');    $('#authEyebrow').textContent    =    '—    ADMIN    SIGN    IN';    $('#authHeading').textContent    =    'Access    the    control    room.';    $('#authDescription').textContent    =    'Sign    in    with    an    account    that    has    Gather    admin    access.';    openAuth();    });
$('#authButton').addEventListener('click',    async    ()    =>    {    if    (db    &&    user)    {    await    db.auth.signOut();    toast('Signed    out.');    }    else    openAuth();    });
$('#authForm').addEventListener('submit',    async    e    =>    {    e.preventDefault();    if    (!db)    {    toast('Add    your    Supabase    keys    to    .env.local    first.');    return;    }    const    email    =    new    FormData(e.currentTarget).get('email');    const    {    error    }    =    await    db.auth.signInWithOtp({    email,    options:    {    emailRedirectTo:    window.location.href    }    });    if    (error)    toast(error.message);    else    {    $('#authDialog').classList.add('hide');    toast(sessionStorage.getItem('gather-admin-login')    ===    '1'    ?    'Check    your    email    for    the    admin    sign-in    link.'    :    'Check    your    email    for    your    secure    sign-in    link.');    }    });
$('#create').addEventListener('click',    ()    =>    $('#eventDialog').classList.remove('hide'));
$('#eventForm').addEventListener('submit',    async    e    =>    {
        e.preventDefault();    const    f    =    new    FormData(e.currentTarget);    const    item    =    {    name:    String(f.get('name')).trim(),    category:    f.get('category'),    date:    f.get('date'),    time:    f.get('time'),    venue:    String(f.get('venue')).trim(),    price_kes:    Number(f.get('price')),    art:    (events.length    %    6)    +    1,    capacity:    100,    status:    'draft'    };
        if    (db)    {    if    (!user)    {    $('#eventDialog').classList.add('hide');    openAuth();    toast('Sign    in    to    create    your    event.');    return;    }    const    {    error    }    =    await    db.from('gather_events').insert({    ...item,    organizer_id:    user.id    });    if    (error)    {    toast(error.message);    return;    }    }
        else    {    events    =    [{    ...item,    id:    Date.now(),    price:    item.price_kes,    tag:    item.category.toUpperCase(),    sold:    0    },    ...events];    persist();    }
        e.currentTarget.reset();    $('#eventDialog').classList.add('hide');    await    refreshData();    showPage('studio');    toast('Your    draft    event    is    saved    ✳');
});
$('#ticketType').addEventListener('change',    e    =>    {    ticketType    =    e.target.value;    updateTotal();    });
$('#minus').addEventListener('click',    ()    =>    {    quantity    =    Math.max(1,    quantity    -    1);    updateTotal();    });    $('#plus').addEventListener('click',    ()    =>    {    quantity    =    Math.min(10,    quantity    +    1);    updateTotal();    });
$('#checkout').addEventListener('click',    async    ()    =>    {
        if    (!current)    return;
        if    (!db)    {    toast('Booking    is    temporarily    unavailable.    Please    try    again    shortly.');    return;    }
        if    (!current.manualPaymentRequired    &&    !user)    {    $('#buyDialog').classList.add('hide');    openAuth();    toast('Sign    in    to    book    tickets.');    return;    }
        if    (current.manualPaymentRequired)    {
                const    buyerName    =    $('#buyerName').value.trim();    const    buyerPhone    =    $('#buyerPhone').value.trim();    const    buyerEmail    =    $('#buyerEmail').value.trim();
                if    (buyerName.length    <    2)    {    toast('Enter    your    full    name.');    $('#buyerName').focus();    return;    }
                if    (!/^(\+?254|0)?[17][0-9\s()-]{7,14}$/.test(buyerPhone))    {    toast('Enter    a    valid    Kenyan    mobile    number.');    $('#buyerPhone').focus();    return;    }
                if    (buyerEmail    &&    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail))    {    toast('Check    the    email    address    or    leave    it    blank.');    $('#buyerEmail').focus();    return;    }
                const    code    =    paymentMethod    ===    'binance_pay'    ?    $('#binanceCode').value.trim().toUpperCase()    :    $('#mpesaCode').value.trim().toUpperCase();
                if    (!/^[A-Z0-9]{6,40}$/.test(code))    {    toast(`Enter    the    ${paymentMethod    ===    'binance_pay'    ?    'Binance    Pay'    :    'M-Pesa'}    transaction    reference.`);    return;    }
                let    cryptoAsset    =    null,    cryptoAmount    =    null;
                if    (paymentMethod    ===    'binance_pay')    {    cryptoAsset    =    $('#cryptoAsset').value.trim().toUpperCase();    cryptoAmount    =    Number($('#cryptoAmount').value);    if    (!/^[A-Z0-9]{2,12}$/.test(cryptoAsset)    ||    !Number.isFinite(cryptoAmount)    ||    cryptoAmount    <=    0)    {    toast('Enter    the    crypto    asset    and    amount    you    sent.');    return;    }    }
                const    {    data,    error    }    =    await    db.rpc('submit_gather_guest_booking',    {    p_event_id:    current.id,    p_quantity:    quantity,    p_ticket_type:    ticketType,    p_payment_method:    paymentMethod,    p_transaction_code:    code,    p_buyer_name:    buyerName,    p_buyer_phone:    buyerPhone,    p_buyer_email:    buyerEmail    ||    null,    p_crypto_asset:    cryptoAsset,    p_crypto_amount:    cryptoAmount    });
                if    (error)    {    toast(error.message.includes('duplicate    key')    ?    'That    payment    reference    has    already    been    submitted.'    :    error.message);    return;    }
                lastReceipt    =    {    ...data,    event_name:    current.name,    event_date:    current.date,    venue:    current.venue,    ticket_type:    ticketType,    quantity,    payment_method:    paymentMethod,    payment_status:    data.payment_status    };
                downloadReceipt(lastReceipt);    $('#buyDialog').classList.add('hide');    $('#successName').textContent    =    buyerName.split(/\s+/)[0];    $('#successDetails').textContent    =    `${quantity}    ${ticketType.toUpperCase()}    ticket${quantity    ===    1    ?    ''    :    's'}    ·    ${kes(data.amount_kes)}.    Your    payment    reference    is    pending    manual    verification.`;    $('#successReference').textContent    =    `GT-${String(data.order_id).slice(-6).toUpperCase()}`;    $('#bookingSuccessDialog').classList.remove('hide');    if    (user)    void    refreshData();    return;
        }
        const    {    error    }    =    await    db.from('gather_orders').insert({    event_id:    current.id,    buyer_id:    user.id,    quantity,    ticket_type:    ticketType    });    if    (error)    {    toast(error.message);    return;    }
        $('#buyDialog').classList.add('hide');    await    refreshData();    showPage('tickets');    toast('Reservation    saved.    No    payment    collected;    this    is    not    an    entry    ticket.');
});
$('#downloadReceiptAgain').addEventListener('click',    ()    =>    {    if    (lastReceipt)    downloadReceipt(lastReceipt);    });
$('#myTickets').addEventListener('click',    e    =>    {    const    button    =    e.target.closest('[data-download-receipt]');    if    (!button)    return;    const    t    =    tickets.find(item    =>    String(item.id)    ===    button.dataset.downloadReceipt);    if    (t?.payment)    downloadReceipt({    ...t.payment,    order_id:    t.id,    event_name:    t.name,    event_date:    t.date,    venue:    t.venue,    amount_kes:    t.amount,    ticket_type:    t.ticketType,    quantity:    t.quantity,    payment_status:    t.payment.status    });    });
['manage','manage2'].forEach(id    =>    $('#'+id).addEventListener('click',    ()    =>    toast(`You’re    viewing    ${events.length}    events.`)));
['orders','orders2','orders3'].forEach(id    =>    $('#'+id).addEventListener('click',    ()    =>    toast('Reservations    are    stored.    A    payment    provider    is    not    configured    yet.')));
if    (db)    {
db.auth.onAuthStateChange((_event,    session)    =>    {    user    =    session?.user    ||    null;    void    refreshData().then(()    =>    {    if    (!user    &&    !$('#admin').classList.contains('hide'))    showPage('discover');    finishAdminLogin();    });    });
db.auth.getSession().then(({    data    })    =>    {    user    =    data.session?.user    ||    null;    void    refreshData().then(()    =>    {    if    (!user    &&    !$('#admin').classList.contains('hide'))    showPage('discover');    finishAdminLogin();    });    });
}    else    {    $('#connectionStatus').textContent    =    'Demo    mode    ·    local    data';    render();    }



