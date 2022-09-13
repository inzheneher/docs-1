import React from 'react';

import Admonition from '@theme/Admonition';
import CodeBlock from '@theme/CodeBlock';

import getProductVariablesByProdname from '../../utils/getProductVariablesByProdname';

export default function PrivateRegistryRegular(props) {
  const productVariables = getProductVariablesByProdname(props.prodname);

  if (!productVariables) {
    console.error(`Invalid "props.prodname": ${props.prodname}`);

    return null;
  }

  const { tigeraOperator, components } = productVariables;
  const componentsWithImage = Object.values(components).filter(filters.withImage);

  return (
    <>
      <h4 id='push-images-to-your-private-registry'>Push {props.prodname} images to your private registry</h4>
      <p>
        In order to install images from your private registry, you must first pull the images from Tigera&#39;s
        registry, re-tag them with your own registry, and then push the newly tagged images to your own registry.
      </p>
      <ol>
        <li>
          <p>Use the following commands to pull the required {props.prodname} images.</p>
        </li>
        <CodeBlock language='bash'>
          {`docker pull ${tigeraOperator.registry}/${tigeraOperator.image}:${tigeraOperator.version}\n`}
          {componentsWithImage.filter(filters.isNotWindows).map(renderPullCommand)}
        </CodeBlock>
        <p>For hybrid Linux + Windows clusters, pull the following Windows images.</p>
        <CodeBlock language='bash'>{componentsWithImage.filter(filters.isWindows).map(renderPullCommand)}</CodeBlock>

        <li>
          <p>
            Retag the images with the name of your private registry <code>$PRIVATE_REGISTRY</code>.
          </p>
          <CodeBlock language='bash'>
            {`docker tag ${tigeraOperator.registry}/${tigeraOperator.image}:${tigeraOperator.version} $PRIVATE_REGISTRY/${tigeraOperator.image}:${tigeraOperator.version}\n`}
            {componentsWithImage.filter(filters.isNotWindows).map((component) => {
              const registry = mapComponentToRegistry(component);

              return (
                <>{`docker tag ${registry}${component.image}:${component.version} $PRIVATE_REGISTRY/${component.image}:${component.version}\n`}</>
              );
            })}
          </CodeBlock>
          <p>
            For hybrid Linux + Windows clusters, retag the following Windows images with the name of your private
            registry.
          </p>
          <CodeBlock language='bash'>
            {componentsWithImage.filter(filters.isWindows).map((component) => {
              const registry = mapComponentToRegistry(component);
              const imageName = component.image.split('/').pop();

              return (
                <>{`docker tag ${registry}${component.image}:${component.version} $PRIVATE_REGISTRY/$IMAGE_PATH/${imageName}:${component.version}\n`}</>
              );
            })}
          </CodeBlock>
        </li>

        <li>
          <p>Push the images to your private registry.</p>
          <CodeBlock language='bash'>
            {`docker push $PRIVATE_REGISTRY/${tigeraOperator.image}:${tigeraOperator.version}\n`}
            {componentsWithImage.filter(filters.isNotWindows).map((component) => {
              return <>{`docker push $PRIVATE_REGISTRY/${component.image}:${component.version}\n`}</>;
            })}
          </CodeBlock>
          <p>For hybrid Linux + Windows clusters, push the following Windows images to your private registry.</p>
          <CodeBlock language='bash'>
            {componentsWithImage.filter(filters.isWindows).map((component) => {
              const imageName = component.image.split('/').pop();

              return <>{`docker push $PRIVATE_REGISTRY/$IMAGE_PATH/${imageName}:${component.version}\n`}</>;
            })}
          </CodeBlock>
          <Admonition type='caution'>Do not push the private {props.prodname} images to a public registry.</Admonition>
        </li>
      </ol>

      <h4 id='run-the-operator-using-images-from-your-private-registry'>
        Run the operator using images from your private registry
      </h4>
      <p>
        Before applying <code>tigera-operator.yaml</code>, modify registry references to use your custom registry:
      </p>
      <CodeBlock>{`sed -ie "s?quay.io?$PRIVATE_REGISTRY?g" tigera-operator.yaml`}</CodeBlock>
      <p>
        Next, ensure that an image pull secret has been configured for your custom registry. Set the enviroment variable{' '}
        <code>PRIVATE_REGISTRY_PULL_SECRET</code> to the secret name. Then add the image pull secret to the operator
        deployment spec:
      </p>
      <CodeBlock language='bash'>
        {`sed -ie "/serviceAccountName: tigera-operator/a \      imagePullSecrets:\\n\      - name: $PRIVATE_REGISTRY_PULL_SECRET"  tigera-operator.yaml`}
      </CodeBlock>
      {/* The second 'sed' should be removed once operator launches Prometheus & Alertmanager */}
      <p>
        If you are installing Prometheus operator as part of {props.prodname}, then before applying{' '}
        <code>tigera-prometheus-operator.yaml</code>, modify registry references to use your custom registry:
      </p>
      <CodeBlock language='bash'>
        {`sed -ie "s?quay.io?$PRIVATE_REGISTRY?g" tigera-prometheus-operator.yaml
sed -ie "/serviceAccountName: calico-prometheus-operator/a \      imagePullSecrets:\\n\      - name: $PRIVATE_REGISTRY_PULL_SECRET"  tigera-prometheus-operator.yaml`}
      </CodeBlock>
      {/* The second 'sed' should be removed once operator launches Prometheus & Alertmanager */}
      <p>
        Before applying <code>custom-resources.yaml</code>, modify registry references to use your custom registry:
      </p>
      <CodeBlock language='bash'>sed -ie "s?quay.io?$PRIVATE_REGISTRY?g" custom-resources.yaml</CodeBlock>
      {/* This step should be removed once operator launches Prometheus & Alertmanager */}

      <h4 id='configure-the-operator-to-use-images-from-your-private-registry'>
        Configure the operator to use images from your private registry.
      </h4>
      <p>
        Set the <code>spec.registry</code> field of your Installation resource to the name of your custom registry. For
        example:
      </p>
      <CodeBlock language='yaml'>{`apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  variant: TigeraSecureEnterprise
  imagePullSecrets:
    - name: tigera-pull-secret
  <b>registry: myregistry.com</b>`}</CodeBlock>
    </>
  );

  function renderPullCommand(component) {
    const registry = mapComponentToRegistry(component);

    return <>{`docker pull ${registry}${component.image}:${component.version}\n`}</>;
  }

  function mapComponentToRegistry(component) {
    if (!component.registry) {
      return productVariables.registry;
    }

    return `${component.registry}/`;
  }
}

const filters = {
  withImage: (component) => !!component.image,
  isWindows: (component) => component.image.includes('-windows'),
  isNotWindows: (component) => !filters.isWindows(component),
};
