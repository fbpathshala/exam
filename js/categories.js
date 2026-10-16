/* Central category registry for FBPathshala.
 * Keep stable IDs/keys separate from display names so renaming a category
 * never changes existing question/exam identifiers or database records.
 * Pages should render labels from this registry instead of hard-coding them.
 */
(function (global) {
  'use strict';

  const categories = [
    {
      id: 'job',
      name: 'Job Care',
      icon: '💼',
      href: 'https://fbpathshala.github.io/exam/',
      questionBankHref: 'question-bank-type.html?care=job',
      active: true,
      order: 10
    },
    {
      id: 'academic',
      name: 'Academic Care',
      icon: '🎓',
      href: 'https://fbpathshala.github.io/academic/',
      questionBankHref: 'question-bank-type.html?care=academic',
      active: true,
      order: 20
    }
  ];

  const api = {
    all() {
      return categories.filter(item => item.active).slice().sort((a, b) => a.order - b.order);
    },
    get(id) {
      return categories.find(item => item.id === id) || null;
    },
    label(id) {
      const item = this.get(id);
      return item ? item.name : id;
    },
    renderNavigation(container, options) {
      if (!container) return;
      const opts = options || {};
      container.replaceChildren();
      this.all().forEach(item => {
        const link = document.createElement('a');
        link.href = opts.questionBank ? item.questionBankHref : item.href;
        link.dataset.categoryId = item.id;
        link.textContent = opts.questionBank ? item.name : (item.id === 'job' ? item.name + ' · Exam System' : item.name);
        container.appendChild(link);
      });
    },
    renderCards(container) {
      if (!container) return;
      container.replaceChildren();
      this.all().forEach(item => {
        const link = document.createElement('a');
        link.className = 'card ' + item.id;
        link.href = item.questionBankHref;
        link.dataset.categoryId = item.id;
        const icon = document.createElement('span');
        icon.className = 'icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = item.icon;
        const label = document.createElement('span');
        label.textContent = item.name;
        link.append(icon, label);
        container.appendChild(link);
      });
    }
  };

  global.FBPathshalaCategories = Object.freeze(api);
})(window);
