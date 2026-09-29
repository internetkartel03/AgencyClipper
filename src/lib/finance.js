export function buildMoneyModel(clientRows = [], paymentRows = [], members = [], now = new Date()) {
  const active = clientRows.filter(client => client.status === 'ACTIVE');
  const totalRevenue = paymentRows.filter(payment => payment.status === 'PAID').reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const mrr = active.reduce((sum, client) => sum + (Number(client.monthlyFee) || 0), 0);
  const breakdown = active.map(client => {
    const setup = paymentRows.filter(payment => payment.client === client.id && payment.type === 'SETUP');
    const cost = members.filter(member => member.client === client.id).reduce((sum, member) => sum + (Number(member.cost) || 0), 0);
    return { ...client, cost, profit: (Number(client.monthlyFee) || 0) - cost, setupPaid: setup.some(payment => payment.status === 'PAID') };
  });
  const totalCost = breakdown.reduce((sum, client) => sum + client.cost, 0);
  const today = now.toISOString().slice(0, 10);
  const trackedPayments = paymentRows.map(payment => ({
    ...payment,
    displayStatus: payment.status === 'PAID' ? 'PAID' : payment.dueDate && payment.dueDate < today ? 'OVERDUE' : payment.status || 'PENDING',
  }));
  const paidCount = trackedPayments.filter(payment => payment.displayStatus === 'PAID').length;
  const collection = trackedPayments.length ? Math.round((paidCount / trackedPayments.length) * 100) : 0;
  const datedClients = active.filter(client => client.startDate);
  const months = datedClients.length ? Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now); date.setDate(1); date.setMonth(date.getMonth() - 11 + index);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return {
      name: date.toLocaleDateString('en-US', { month: 'short' }),
      mrr: datedClients.filter(client => new Date(`${client.startDate}T12:00:00`) <= end).reduce((sum, client) => sum + (Number(client.monthlyFee) || 0), 0),
    };
  }) : [];
  return { active, totalRevenue, mrr, breakdown, totalCost, profit: mrr - totalCost, trackedPayments, collection, months };
}
