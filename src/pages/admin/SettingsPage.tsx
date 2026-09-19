import SectionTitle from '../../components/common/SectionTitle';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';

function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Configuración de la clínica" align="left" />

      <form
        onSubmit={(event) => event.preventDefault()}
        className="flex max-w-md flex-col gap-4 rounded-[14px] border border-adm-line-card bg-white p-[22px] shadow-soft"
      >
        <Input label="Nombre de la clínica" defaultValue="KristellDent" variant="admin" />
        <Input label="Correo de contacto" type="email" defaultValue="citas@clinica.com" variant="admin" />
        <Select
          label="Zona horaria"
          defaultValue="america-lima"
          options={[
            { value: 'america-lima', label: 'América/Lima' },
            { value: 'europe-madrid', label: 'Europa/Madrid' },
          ]}
        />
        <Button type="submit" variant="admin-solid" className="w-fit">
          Guardar cambios
        </Button>
      </form>
    </div>
  );
}

export default SettingsPage;
