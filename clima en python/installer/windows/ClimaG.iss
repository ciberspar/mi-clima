
#define MyAppName "Clima G"
#define MyAppVersion "1.34.0"
#define MyAppPublisher "Clima G"
#define MyAppExeName "Clima G.exe"

#ifndef SourceDir
  #define SourceDir "windows-build\Clima G"
#endif

[Setup]
AppId={{9B8E6D31-4F72-4D96-A315-7C2F1E8B604A}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
SetupIconFile=imagen-setup-de-clima-g-para-windows.ico

DefaultDirName={localappdata}\Programs\Clima G
DefaultGroupName=Clima G

PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

DisableProgramGroupPage=yes
Uninstallable=yes
UninstallDisplayIcon={app}\{#MyAppExeName}

OutputDir=output
OutputBaseFilename=Clima-G-Setup

Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupLogging=yes

CloseApplications=yes
RestartApplications=no

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Crear un acceso directo en el escritorio"; GroupDescription: "Accesos directos:"; Flags: unchecked

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Clima G"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\Clima G"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Iniciar Clima G"; Flags: postinstall nowait skipifsilent
