import { PermissionAction } from '@supabase/shared-types/out/constants'
import { useParams } from 'common'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  AlertDescription_Shadcn_,
  AlertTitle_Shadcn_,
  Alert_Shadcn_,
  Form,
  IconAlertCircle,
  Toggle,
} from 'ui'
import { boolean, object, string } from 'yup'

import {
  FormActions,
  FormHeader,
  FormPanel,
  FormSection,
  FormSectionContent,
  FormSectionLabel,
} from 'components/ui/Forms'
import UpgradeToPro from 'components/ui/UpgradeToPro'
import { useAuthConfigQuery } from 'data/auth/auth-config-query'
import { useAuthConfigUpdateMutation } from 'data/auth/auth-config-update-mutation'
import { useOrgSubscriptionQuery } from 'data/subscriptions/org-subscription-query'
import { useCheckPermissions, useSelectedOrganization } from 'hooks'

import HookSelector from './HookSelector'

const schema = object({
  HOOKS_MFA_VERIFICATION_ATTEMPT_ENABLED: boolean(),
  HOOKS_MFA_VERIFICATION_ATTEMPT_URI: string(),
  HOOKS_PASSWORD_VERIFICATION_ATTEMPT_ENABLED: boolean(),
  HOOKS_PASSWORD_VERIFICATION_ATTEMPT_URI: string(),
})

const FORM_ID = 'enterprise-hooks-config'

const EnterpriseHooksConfig = () => {
  const { ref: projectRef } = useParams()
  const {
    data: authConfig,
    error: authConfigError,
    isLoading,
    isError,
    isSuccess,
  } = useAuthConfigQuery({ projectRef })
  const { mutate: updateAuthConfig, isLoading: isUpdatingConfig } = useAuthConfigUpdateMutation()
  const canUpdateConfig = useCheckPermissions(PermissionAction.UPDATE, 'custom_config_gotrue')

  const organization = useSelectedOrganization()
  const { data: subscription, isSuccess: isSuccessSubscription } = useOrgSubscriptionQuery({
    orgSlug: organization?.slug,
  })

  const isTeamsEnterprisePlan =
    isSuccessSubscription && subscription?.plan?.id !== 'free' && subscription?.plan?.id !== 'pro'

  const INITIAL_VALUES = {
    HOOK_MFA_VERIFICATION_ATTEMPT_ENABLED:
      authConfig?.HOOK_MFA_VERIFICATION_ATTEMPT_ENABLED || false,
    HOOK_MFA_VERIFICATION_ATTEMPT_URI: authConfig?.HOOK_MFA_VERIFICATION_ATTEMPT_URI || '',
    // remove as any when the types are merged in
    HOOK_PASSWORD_VERIFICATION_ATTEMPT_ENABLED:
      (authConfig as any)?.HOOK_PASSWORD_VERIFICATION_ATTEMPT_ENABLED || false,
    HOOK_PASSWORD_VERIFICATION_ATTEMPT_URI:
      (authConfig as any)?.HOOK_PASSWORD_VERIFICATION_ATTEMPT_URI || '',
  }

  const onSubmit = (values: any, { resetForm }: any) => {
    const payload = { ...values }
    if (payload.HOOK_MFA_VERIFICATION_ATTEMPT_URI === '') {
      payload.HOOK_MFA_VERIFICATION_ATTEMPT_URI = null
    }
    if (payload.HOOK_PASSWORD_VERIFICATION_ATTEMPT_URI === '') {
      payload.HOOK_PASSWORD_VERIFICATION_ATTEMPT_URI = null
    }
    updateAuthConfig(
      { projectRef: projectRef!, config: payload },
      {
        onError: () => {
          toast.error(`Failed to update settings`)
        },
        onSuccess: () => {
          toast.success(`Successfully updated settings`)
          resetForm({ values: values, initialValues: values })
        },
      }
    )
  }

  if (isError) {
    return (
      <Alert_Shadcn_ variant="destructive">
        <IconAlertCircle strokeWidth={2} />
        <AlertTitle_Shadcn_>Failed to retrieve auth configuration</AlertTitle_Shadcn_>
        <AlertDescription_Shadcn_>{authConfigError.message}</AlertDescription_Shadcn_>
      </Alert_Shadcn_>
    )
  }

  return (
    <Form id={FORM_ID} initialValues={INITIAL_VALUES} onSubmit={onSubmit} validationSchema={schema}>
      {({ handleReset, resetForm, values, initialValues, setFieldValue }: any) => {
        const hasChanges = JSON.stringify(values) !== JSON.stringify(initialValues)

        // Form is reset once remote data is loaded in store
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          if (isSuccess) {
            resetForm({ values: INITIAL_VALUES, initialValues: INITIAL_VALUES })
          }
        }, [isSuccess])

        return (
          <>
            <FormHeader
              title="Enterprise Hooks"
              description="Advanced Auth hooks are available to Teams and Enterprise plan customers."
            />
            <FormPanel
              disabled={true}
              footer={
                <div className="flex py-4 px-8">
                  <FormActions
                    form={FORM_ID}
                    isSubmitting={isUpdatingConfig}
                    hasChanges={hasChanges}
                    handleReset={handleReset}
                    disabled={!canUpdateConfig || !isTeamsEnterprisePlan}
                    helper={
                      !canUpdateConfig
                        ? 'You need additional permissions to update authentication settings'
                        : undefined
                    }
                  />
                </div>
              }
            >
              {!isTeamsEnterprisePlan && organization !== undefined && (
                <UpgradeToPro
                  primaryText="Upgrade plan"
                  secondaryText="Configuring Enterprise Hooks requires a Teams or Enterprise plan."
                  projectRef={projectRef!}
                  organizationSlug={organization.slug}
                  buttonText="Upgrade"
                />
              )}
              <div className={isTeamsEnterprisePlan ? '' : 'opacity-50'}>
                <FormSection header={<FormSectionLabel>MFA Verification Attempt</FormSectionLabel>}>
                  <FormSectionContent loading={isLoading}>
                    <HookSelector
                      uriId="HOOK_MFA_VERIFICATION_ATTEMPT_URI"
                      enabledId="HOOK_MFA_VERIFICATION_ATTEMPT_ENABLED"
                      descriptionTextPostgres="Select the function to be called by Supabase Auth each time a user tries to verify an MFA factor. Return a decision on whether to reject the attempt and future ones, or to allow the user to keep trying."
                      descriptionTextWeb="Supabase Auth will send a HTTP POST request to this URL each time a user tries to verify an MFA factor. Return a decision on whether to reject the attempt and future ones, or to allow the user to keep trying."
                      values={values}
                      setFieldValue={setFieldValue}
                      disabled={!canUpdateConfig || !isTeamsEnterprisePlan}
                    />
                  </FormSectionContent>
                </FormSection>
                <div className="border-t border-muted"></div>

                <FormSection
                  header={<FormSectionLabel>Password Verification Attempt</FormSectionLabel>}
                >
                  <FormSectionContent loading={isLoading}>
                    <HookSelector
                      uriId="HOOK_PASSWORD_VERIFICATION_ATTEMPT_URI"
                      enabledId="HOOK_PASSWORD_VERIFICATION_ATTEMPT_ENABLED"
                      descriptionTextPostgres="Select the function to be called by Supabase Auth each time a user tries to sign in with a password. Return a decision whether to allow the user to reject the attempt, or to allow the user to keep trying."
                      descriptionTextWeb="Supabase Auth will send a HTTP POST request to this URL each time a user tries to sign in with a password. Return a decision whether to allow the user to reject the attempt, or to allow the user to keep trying."
                      values={values}
                      setFieldValue={setFieldValue}
                      disabled={!canUpdateConfig || !isTeamsEnterprisePlan}
                    />
                  </FormSectionContent>
                </FormSection>
              </div>
              <div className="border-t border-muted"></div>
            </FormPanel>
          </>
        )
      }}
    </Form>
  )
}

export default EnterpriseHooksConfig
