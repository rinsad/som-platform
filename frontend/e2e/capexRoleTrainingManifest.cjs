const roleTraining = [
  {
    role: 'Project Owner',
    slug: 'project-owner',
    completeWorkflows: [
      {
        id: '00-complete-project-owner-workflow',
        title: 'Complete Project Owner CAPEX workflow',
        narration: [
          'Project Owner complete workflow. This training video follows the role from login through request creation, execution tracking, document controls, risk capture, and closure controls.',
          'The Project Owner starts in CAPEX planning, reviews the available workspace, and opens the Requests area where new CAPEX work is initiated.',
          'The user creates a CAPEX request with scope, budget holder, estimated value, urgency, HSSE and worker welfare risk, expected savings, ROI, and supplier quotations.',
          'After submission, the request appears in the CAPEX request register with value band, status, and approval routing.',
          'The user opens the request details to review scope, quotations, attachments, and the approval workflow.',
          'The Project Owner can manage execution by adding delivery milestones, payment percentage, payment amount, evidence file name, and marking the milestone complete.',
          'The role can also maintain document controls by saving a document version and capturing a signer name and role for the evidence trail.',
          'The Project Owner can add operational risks with category, severity, mitigation plan, and can update PO closure and closure checklist items where the role is allowed.',
          'The workflow ends by showing audit history, demonstrating that each action leaves a traceable record for governance and handover to the next role.',
        ].join(' '),
      },
    ],
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
