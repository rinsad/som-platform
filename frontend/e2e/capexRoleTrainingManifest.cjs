const roleTraining = [
  {
    role: 'Project Owner',
    slug: 'project-owner',
    useCases: [
      {
        id: '01-create-capex-request',
        title: 'Create CAPEX request with supplier quotations',
        narration: 'Project Owner workflow one. Create a new CAPEX request, capture the business scope, budget holder, estimated value, three supplier quotations, selected supplier, payment terms, and submit the request into the approval workflow.',
      },
      {
        id: '02-manage-project-execution',
        title: 'Manage project execution milestones',
        narration: 'Project Owner workflow two. Open an existing CAPEX request, add an execution milestone with planned date, payment percentage, payment amount, evidence, then complete the milestone to show project delivery tracking.',
      },
      {
        id: '03-document-version-and-signature',
        title: 'Maintain document versions and signatures',
        narration: 'Project Owner workflow three. Open the request document controls, save a controlled document version, then capture a signer name and signer role for the approval evidence trail.',
      },
      {
        id: '04-risk-and-closure-controls',
        title: 'Add project risk and update closure controls',
        narration: 'Project Owner workflow four. Add a project risk with category, severity, mitigation plan, and owner, then update PO closure fields and complete a closure checklist item.',
      },
    ],
  },
];

function getRoleTraining(role) {
  return roleTraining.find((item) => item.role === role || item.slug === role);
}

module.exports = {
  roleTraining,
  getRoleTraining,
};
