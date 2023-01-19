import * as React from "react";
import dynamic from "next/dynamic";
import { Layout } from "components/Layout";
import { getSessionUser } from "lib/auth";
import { getTranslations } from "lib/getTranslation";
import type { GetServerSideProps } from "next";
import { ActiveCalls } from "components/dispatch/active-calls/active-calls";
import { useDispatchState } from "state/dispatch/dispatch-state";
import { ActiveBolos } from "components/active-bolos/active-bolos";
import { DispatchModalButtons } from "components/dispatch/ModalButtons";
import { useTranslations } from "use-intl";
import { ActiveOfficers } from "components/dispatch/active-officers";
import { ActiveDeputies } from "components/dispatch/active-deputies";
import { requestAll } from "lib/utils";
import { useSignal100 } from "hooks/shared/useSignal100";
import { usePanicButton } from "hooks/shared/usePanicButton";
import { Title } from "components/shared/Title";
import { ValueType } from "@snailycad/types";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";
import { ModalIds } from "types/ModalIds";
import { useModal } from "state/modalState";
import { Permissions } from "@snailycad/permissions";
import { useLoadValuesClientSide } from "hooks/useLoadValuesClientSide";
import type {
  Get911CallsData,
  GetActiveOfficersData,
  GetBolosData,
  GetDispatchData,
  GetEmsFdActiveDeputies,
} from "@snailycad/types/api";
import { UtilityPanel } from "components/shared/UtilityPanel";
import { useCall911State } from "state/dispatch/call-911-state";
import { DndProvider } from "components/shared/dnd/DndProvider";

const ActiveIncidents = dynamic(async () => {
  return (await import("components/dispatch/active-incidents")).ActiveIncidents;
});

const Modals = {
  CustomFieldSearch: dynamic(async () => {
    return (await import("components/leo/modals/CustomFieldSearch/CustomFieldSearch"))
      .CustomFieldSearch;
  }),
  NameSearchModal: dynamic(async () => {
    return (await import("components/leo/modals/NameSearchModal/NameSearchModal")).NameSearchModal;
  }),
  VehicleSearchModal: dynamic(async () => {
    return (await import("components/leo/modals/VehicleSearchModal")).VehicleSearchModal;
  }),
  WeaponSearchModal: dynamic(async () => {
    return (await import("components/leo/modals/weapon-search-modal")).WeaponSearchModal;
  }),
  NotepadModal: dynamic(async () => {
    return (await import("components/shared/NotepadModal")).NotepadModal;
  }),
  AddressSearchModal: dynamic(async () => {
    return (await import("components/dispatch/modals/AddressSearchModal")).AddressSearchModal;
  }),
};

export interface DispatchPageProps extends GetDispatchData {
  activeDeputies: GetEmsFdActiveDeputies;
  activeOfficers: GetActiveOfficersData;
  calls: Get911CallsData;
  bolos: GetBolosData;
}

export default function DispatchDashboard(props: DispatchPageProps) {
  useLoadValuesClientSide({
    valueTypes: [
      ValueType.CALL_TYPE,
      ValueType.CITIZEN_FLAG,
      ValueType.DRIVERSLICENSE_CATEGORY,
      ValueType.IMPOUND_LOT,
      ValueType.LICENSE,
      ValueType.PENAL_CODE,
      ValueType.VEHICLE_FLAG,
      ValueType.DEPARTMENT,
      ValueType.DIVISION,
    ],
  });

  const state = useDispatchState();
  const set911Calls = useCall911State((state) => state.setCalls);
  const t = useTranslations("Leo");
  const signal100 = useSignal100();
  const panic = usePanicButton();

  const { CALLS_911, ACTIVE_INCIDENTS } = useFeatureEnabled();
  const { isOpen } = useModal();

  React.useEffect(() => {
    set911Calls(props.calls.calls);
    state.setBolos(props.bolos.bolos);

    state.setActiveDispatchers(props.activeDispatchers);
    state.setActiveIncidents(props.activeIncidents);

    state.setActiveDeputies(props.activeDeputies);
    state.setActiveOfficers(props.activeOfficers);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props]);

  return (
    <Layout
      permissions={{ fallback: (u) => u.isDispatch, permissions: [Permissions.Dispatch] }}
      className="dark:text-white"
    >
      <Title renderLayoutTitle={false}>{t("dispatch")}</Title>

      <signal100.Component enabled={signal100.enabled} audio={signal100.audio} />
      <panic.Component audio={panic.audio} unit={panic.unit} />

      <UtilityPanel isDispatch>
        <DispatchModalButtons />
      </UtilityPanel>

      <div id="dispatch">
        <DndProvider id="dispatch">
          <div className="flex flex-col mt-3 md:flex-row md:space-x-3">
            <div className="w-full">
              <ActiveOfficers initialOfficers={props.activeOfficers} />
              <ActiveDeputies initialDeputies={props.activeDeputies} />
            </div>
          </div>
          <div className="mt-3">
            {CALLS_911 ? <ActiveCalls initialData={props.calls} /> : null}
            {ACTIVE_INCIDENTS ? <ActiveIncidents /> : null}
            <ActiveBolos initialBolos={props.bolos} />
          </div>
        </DndProvider>
      </div>

      <Modals.NotepadModal />
      {/* name search have their own vehicle/weapon search modal */}
      {isOpen(ModalIds.NameSearch) ? null : (
        <>
          <Modals.WeaponSearchModal id={ModalIds.WeaponSearch} />
          <Modals.VehicleSearchModal id={ModalIds.VehicleSearch} />
        </>
      )}
      <Modals.AddressSearchModal />
      <Modals.NameSearchModal />
      <Modals.CustomFieldSearch />
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req, locale }) => {
  const user = await getSessionUser(req);
  const [
    values,
    calls,
    bolos,
    { activeDispatchers, activeIncidents },
    activeOfficers,
    activeDeputies,
  ] = await requestAll(req, [
    ["/admin/values/codes_10", []],
    ["/911-calls", { calls: [], totalCount: 0 }],
    ["/bolos", { bolos: [], totalCount: 0 }],
    ["/dispatch", { activeDispatchers: [], activeIncidents: [] }],
    ["/leo/active-officers", []],
    ["/ems-fd/active-deputies", []],
  ]);

  return {
    props: {
      session: user,
      calls,
      bolos,
      values,
      activeOfficers,
      activeDeputies,
      activeDispatchers,
      activeIncidents,
      messages: {
        ...(await getTranslations(
          ["citizen", "truck-logs", "ems-fd", "leo", "calls", "common"],
          user?.locale ?? locale,
        )),
      },
    },
  };
};
